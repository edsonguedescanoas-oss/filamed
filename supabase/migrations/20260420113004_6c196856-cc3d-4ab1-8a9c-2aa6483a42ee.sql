-- =====================================================================
-- Cleanup do bucket tts-cache direto do banco, sem depender do Worker
-- =====================================================================
-- Motivo: filamed.lovable.app redireciona /hooks/* para filamed.com.br
-- (custom domain), e filamed.com.br não aponta pro Worker. Em vez de
-- depender desse roteamento frágil, fazemos a limpeza inteira via
-- pg_net + Supabase Storage REST API (service_role), que é estável.
--
-- Estratégia:
--   1) Lista objetos do bucket tts-cache via POST /storage/v1/object/list/tts-cache
--   2) Para cada objeto com updated_at > 30 dias, dispara DELETE
--   3) Tudo registrado em tts_cache_cleanup_log para auditoria
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Tabela de auditoria das execuções
CREATE TABLE IF NOT EXISTS public.tts_cache_cleanup_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  executed_at timestamptz NOT NULL DEFAULT now(),
  scanned int NOT NULL DEFAULT 0,
  deleted int NOT NULL DEFAULT 0,
  error text
);

ALTER TABLE public.tts_cache_cleanup_log ENABLE ROW LEVEL SECURITY;

-- Só admins podem ler o log
DROP POLICY IF EXISTS "admin lê tts_cache_cleanup_log" ON public.tts_cache_cleanup_log;
CREATE POLICY "admin lê tts_cache_cleanup_log"
  ON public.tts_cache_cleanup_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------
-- Função que lista o bucket e remove arquivos antigos via Storage REST.
-- Usa um secret armazenado na vault ou parâmetro: passamos a service_role
-- inline porque pg_cron precisa do contexto.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_tts_cache(
  _service_role_key text,
  _retention_days int DEFAULT 30
)
RETURNS TABLE(scanned int, deleted int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _supabase_url text := 'https://bccvpirrqwhqsinlmpth.supabase.co';
  _bucket text := 'tts-cache';
  _cutoff timestamptz := now() - make_interval(days => _retention_days);
  _list_request_id bigint;
  _list_response jsonb;
  _objects jsonb;
  _obj jsonb;
  _names text[] := ARRAY[]::text[];
  _scanned int := 0;
  _deleted int := 0;
  _delete_request_id bigint;
  _delete_response jsonb;
  _attempts int;
BEGIN
  -- 1) Lista objetos do bucket (limit 1000 - se houver mais, próxima execução pega)
  _list_request_id := net.http_post(
    url     := _supabase_url || '/storage/v1/object/list/' || _bucket,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || _service_role_key,
      'apikey', _service_role_key,
      'Content-Type', 'application/json'
    ),
    body    := jsonb_build_object(
      'limit', 1000,
      'offset', 0,
      'sortBy', jsonb_build_object('column', 'updated_at', 'order', 'asc')
    )
  );

  -- Espera resposta (poll com timeout ~10s)
  _attempts := 0;
  LOOP
    SELECT content::jsonb INTO _list_response
    FROM net._http_response
    WHERE id = _list_request_id;
    EXIT WHEN _list_response IS NOT NULL OR _attempts >= 20;
    PERFORM pg_sleep(0.5);
    _attempts := _attempts + 1;
  END LOOP;

  IF _list_response IS NULL THEN
    INSERT INTO public.tts_cache_cleanup_log(scanned, deleted, error)
    VALUES (0, 0, 'list timeout (no response from storage)');
    scanned := 0; deleted := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  _objects := _list_response;
  _scanned := jsonb_array_length(_objects);

  -- 2) Filtra os antigos
  FOR _obj IN SELECT * FROM jsonb_array_elements(_objects)
  LOOP
    IF (_obj->>'updated_at')::timestamptz < _cutoff THEN
      _names := array_append(_names, _obj->>'name');
    END IF;
  END LOOP;

  -- 3) Remove em uma chamada (Storage aceita array)
  IF array_length(_names, 1) > 0 THEN
    _delete_request_id := net.http_delete(
      url     := _supabase_url || '/storage/v1/object/' || _bucket,
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || _service_role_key,
        'apikey', _service_role_key,
        'Content-Type', 'application/json'
      ),
      body    := jsonb_build_object('prefixes', to_jsonb(_names))
    );

    _attempts := 0;
    LOOP
      SELECT content::jsonb INTO _delete_response
      FROM net._http_response
      WHERE id = _delete_request_id;
      EXIT WHEN _delete_response IS NOT NULL OR _attempts >= 20;
      PERFORM pg_sleep(0.5);
      _attempts := _attempts + 1;
    END LOOP;

    IF _delete_response IS NULL THEN
      INSERT INTO public.tts_cache_cleanup_log(scanned, deleted, error)
      VALUES (_scanned, 0, 'delete timeout');
      scanned := _scanned; deleted := 0;
      RETURN NEXT;
      RETURN;
    END IF;

    _deleted := jsonb_array_length(_delete_response);
  END IF;

  INSERT INTO public.tts_cache_cleanup_log(scanned, deleted)
  VALUES (_scanned, _deleted);

  scanned := _scanned;
  deleted := _deleted;
  RETURN NEXT;
END;
$$;

-- Não dar EXECUTE para anon/authenticated — só roda via cron (postgres role).
REVOKE ALL ON FUNCTION public.cleanup_tts_cache(text, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_tts_cache(text, int) FROM anon, authenticated;