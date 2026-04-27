-- 1) Tabela privada para segredos internos do sistema
CREATE TABLE IF NOT EXISTS public.internal_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS ativo, sem políticas: só SECURITY DEFINER e service_role acessam
ALTER TABLE public.internal_config ENABLE ROW LEVEL SECURITY;

-- 2) Garante a existência do segredo (gera aleatório uma única vez)
INSERT INTO public.internal_config (key, value)
VALUES ('waduck_notify_secret', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

-- 3) Atualiza notify_new_ticket para enviar o token interno
CREATE OR REPLACE FUNCTION public.notify_new_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _jwt_claims text;
  _user_id text;
  _internal_token text;
BEGIN
  _jwt_claims := current_setting('request.jwt.claims', true);
  IF _jwt_claims IS NOT NULL AND _jwt_claims <> '' THEN
    BEGIN
      _user_id := (_jwt_claims::jsonb)->>'sub';
    EXCEPTION WHEN OTHERS THEN
      _user_id := NULL;
    END;
  END IF;

  SELECT value INTO _internal_token FROM public.internal_config WHERE key = 'waduck_notify_secret';

  PERFORM
    net.http_post(
      url := 'https://bccvpirrqwhqsinlmpth.supabase.co/functions/v1/wa-duck-notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(_user_id, 'system'),
        'x-internal-token', coalesce(_internal_token, '')
      ),
      body := jsonb_build_object(
        'senha_id', NEW.id,
        'tipo', 'criacao',
        'idempotency_key', NEW.id::text || '_criacao'
      )
    );

  RETURN NEW;
END;
$function$;

-- 4) Atualiza notify_called_ticket para enviar o token interno
CREATE OR REPLACE FUNCTION public.notify_called_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id text;
  _internal_token text;
BEGIN
  IF (NEW.status = 'chamada' AND (OLD.status IS NULL OR OLD.status <> 'chamada')) THEN
    BEGIN
      _user_id := (current_setting('request.jwt.claims', true)::jsonb)->>'sub';
    EXCEPTION WHEN OTHERS THEN
      _user_id := NULL;
    END;

    SELECT value INTO _internal_token FROM public.internal_config WHERE key = 'waduck_notify_secret';

    PERFORM
      net.http_post(
        url := 'https://bccvpirrqwhqsinlmpth.supabase.co/functions/v1/wa-duck-notify',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || coalesce(_user_id, 'system'),
          'x-internal-token', coalesce(_internal_token, '')
        ),
        body := jsonb_build_object(
          'senha_id', NEW.id,
          'tipo', 'chamada',
          'idempotency_key', NEW.id::text || '_chamada'
        )
      );
  END IF;

  RETURN NEW;
END;
$function$;

-- 5) Restringe colunas sensíveis de senhas para anon (fix do EXPOSED_SENSITIVE_DATA)
-- Mantém a policy SELECT pública existente, mas remove as colunas sensíveis
-- (triagem_dados e paciente_id) do GRANT a nível de coluna.
REVOKE SELECT ON public.senhas FROM anon;
GRANT SELECT (
  id, codigo, status, prioridade, fila_id, unidade_id, posicao,
  tempo_espera_estimado, created_at, updated_at,
  finalizada_em, token_publico, origem, senha_origem_id
) ON public.senhas TO anon;

-- 6) Restringe a policy SELECT pública de chamadas a campos não-sensíveis e remove acesso direto
-- Removemos a policy anônima — chamadas só são lidas por anon via RPC SECURITY DEFINER (get_chamadas_recentes).
DROP POLICY IF EXISTS "público lê chamadas recentes sem dados históricos" ON public.chamadas;

-- 7) Corrige search_path mutável em fn_trigger_alerta_falha_notificacao
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_trigger_alerta_falha_notificacao' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.fn_trigger_alerta_falha_notificacao() SET search_path = public';
  END IF;
END $$;