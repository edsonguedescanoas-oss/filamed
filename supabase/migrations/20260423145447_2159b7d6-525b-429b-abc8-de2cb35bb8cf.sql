-- Adiciona coluna de tentativas se não existir
ALTER TABLE public.notificacoes_log 
ADD COLUMN IF NOT EXISTS tentativas INTEGER DEFAULT 1;

-- Função para reenviar notificações que falharam
CREATE OR REPLACE FUNCTION public.retry_failed_notifications()
RETURNS void AS $$
DECLARE
  rec RECORD;
  _service_role_key text;
BEGIN
  -- Busca notificações que falharam nas últimas 2 horas e que tenham menos de 3 tentativas
  FOR rec IN 
    SELECT n.*, s.id as senha_id
    FROM public.notificacoes_log n
    JOIN public.senhas s ON n.senha_id = s.id
    WHERE n.status = 'falhou' 
      AND n.created_at > now() - interval '2 hours'
      AND n.tentativas < 3
    LIMIT 10 -- Limite por execução para não sobrecarregar
  LOOP
    -- Incrementa contador de tentativas
    UPDATE public.notificacoes_log 
    SET tentativas = tentativas + 1,
        status = 'pendente' -- Coloca em pendente enquanto tenta
    WHERE id = rec.id;

    -- Tenta chamar a edge function novamente
    -- Usamos a service_role_key para garantir permissão (ou 'system' como no trigger)
    PERFORM
      net.http_post(
        url := 'https://bccvpirrqwhqsinlmpth.supabase.co/functions/v1/wa-duck-notify',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT COALESCE(
              current_setting('request.jwt.claims', true)::jsonb->>'sub', 
              'system'
            ))
        ),
        body := jsonb_build_object(
          'senha_id', rec.senha_id,
          'idempotency_key', rec.idempotency_key -- Reutiliza a chave para evitar duplicados se o erro foi no log e não no envio
        )
      );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agenda o cron job para cada 10 minutos
SELECT cron.schedule(
  'retry-failed-notifications',
  '*/10 * * * *',
  'SELECT public.retry_failed_notifications();'
);