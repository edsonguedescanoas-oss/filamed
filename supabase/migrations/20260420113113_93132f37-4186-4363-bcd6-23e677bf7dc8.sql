-- Cofre interno (nem authenticated nem anon têm GRANT). Só funções SECURITY DEFINER acessam.
CREATE TABLE IF NOT EXISTS public.internal_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.internal_settings ENABLE ROW LEVEL SECURITY;
-- Sem policies = ninguém via PostgREST consegue ler/escrever.
REVOKE ALL ON public.internal_settings FROM anon, authenticated, public;

-- Wrapper agendável que pega a chave do cofre.
CREATE OR REPLACE FUNCTION public.cleanup_tts_cache_scheduled()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _key text;
BEGIN
  SELECT value INTO _key
  FROM public.internal_settings
  WHERE key = 'supabase_service_role_key';

  IF _key IS NULL OR _key = '' THEN
    INSERT INTO public.tts_cache_cleanup_log(scanned, deleted, error)
    VALUES (0, 0, 'service role key not configured in internal_settings');
    RETURN;
  END IF;

  PERFORM public.cleanup_tts_cache(_key, 30);
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_tts_cache_scheduled() FROM PUBLIC, anon, authenticated;