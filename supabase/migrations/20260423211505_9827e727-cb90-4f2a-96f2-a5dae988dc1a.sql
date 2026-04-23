REVOKE USAGE ON SCHEMA net FROM public, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA net FROM public, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA net FROM public, anon, authenticated;

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure::text AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'net'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM public, anon, authenticated', fn.signature);
  END LOOP;
END $$;