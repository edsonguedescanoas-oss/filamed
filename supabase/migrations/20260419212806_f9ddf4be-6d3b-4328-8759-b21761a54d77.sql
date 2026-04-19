-- Habilita pg_cron (idempotente)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Função: marca como "ausente" toda senha que está "chamada" há mais de 5 minutos
-- Usa o updated_at como referência (atualizado quando a recepção chama).
CREATE OR REPLACE FUNCTION public.marcar_senhas_ausentes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _afetadas integer;
BEGIN
  WITH atualizadas AS (
    UPDATE public.senhas
    SET status = 'ausente'::senha_status,
        finalizada_em = now(),
        updated_at = now()
    WHERE status = 'chamada'::senha_status
      AND updated_at < now() - interval '5 minutes'
    RETURNING id
  )
  SELECT count(*) INTO _afetadas FROM atualizadas;

  RETURN COALESCE(_afetadas, 0);
END;
$$;

-- Remove agendamento anterior se já existir (idempotente)
DO $$
BEGIN
  PERFORM cron.unschedule('marcar-senhas-ausentes');
EXCEPTION WHEN OTHERS THEN
  -- ignora se ainda não existe
  NULL;
END $$;

-- Agenda: a cada 1 minuto
SELECT cron.schedule(
  'marcar-senhas-ausentes',
  '* * * * *',
  $$ SELECT public.marcar_senhas_ausentes(); $$
);