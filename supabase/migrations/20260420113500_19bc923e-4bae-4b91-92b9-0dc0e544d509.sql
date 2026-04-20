-- =====================================================================
-- Realtime: isolamento de canais por unidade
-- =====================================================================
-- Antes: qualquer authenticated subscrevia qualquer channel/topic em
-- realtime.messages e recebia postgres_changes de qualquer clínica.
-- Agora: o topic precisa começar com o unidade_id do usuário, OU ser
-- um canal explicitamente público (pub:* / tv:*).
-- =====================================================================

-- Garante RLS habilitado (Supabase normalmente já habilita em realtime.messages)
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Limpa policies antigas que podem estar permitindo tudo
DROP POLICY IF EXISTS "authenticated can read messages" ON realtime.messages;
DROP POLICY IF EXISTS "authenticated can write messages" ON realtime.messages;
DROP POLICY IF EXISTS "anon can read public messages" ON realtime.messages;
DROP POLICY IF EXISTS "anon can write public messages" ON realtime.messages;

-- ---------------------------------------------------------------------
-- Helper: o usuário autenticado pode ouvir um topic?
--   - "unidade:<seu_unidade_id>:..."  → autorizado
--   - "pub:..."                         → canais públicos (paciente, etc.)
--   - "tv:..."                          → canais de TV pública
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.realtime_topic_allowed(_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _unidade uuid;
BEGIN
  -- Canais públicos sempre liberados
  IF _topic LIKE 'pub:%' OR _topic LIKE 'tv:%' THEN
    RETURN true;
  END IF;

  -- Canais privados exigem usuário autenticado
  IF _uid IS NULL THEN
    RETURN false;
  END IF;

  _unidade := public.user_unidade_id(_uid);
  IF _unidade IS NULL THEN
    RETURN false;
  END IF;

  -- Topic precisa começar com "unidade:<sua-unidade>:"
  RETURN _topic LIKE ('unidade:' || _unidade::text || ':%');
END;
$$;

GRANT EXECUTE ON FUNCTION public.realtime_topic_allowed(text) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- Policies em realtime.messages
-- ---------------------------------------------------------------------
-- SELECT: ler eventos do topic
CREATE POLICY "topic_isolation_read"
  ON realtime.messages
  FOR SELECT
  TO anon, authenticated
  USING (public.realtime_topic_allowed((realtime.topic())::text));

-- INSERT: emitir broadcast/presence no topic (caso usemos no futuro)
CREATE POLICY "topic_isolation_write"
  ON realtime.messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (public.realtime_topic_allowed((realtime.topic())::text));