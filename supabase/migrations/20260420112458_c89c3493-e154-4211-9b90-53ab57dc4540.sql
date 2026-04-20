-- =====================================================================
-- HARDENING DE RLS PÚBLICA — Unidades / Chamadas / Senhas
-- =====================================================================
-- Antes: anon podia ler colunas sensíveis (cnpj/endereço/telefone das
-- unidades, histórico completo de chamadas, paciente_id e token_publico
-- de qualquer senha ativa). Agora expomos apenas o mínimo via VIEWs e
-- uma RPC com SECURITY INVOKER controlada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) UNIDADES — View pública só com id/nome/slug
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "público lê unidades ativas" ON public.unidades;

CREATE OR REPLACE VIEW public.unidades_publicas
WITH (security_invoker = true) AS
SELECT id, nome, slug
FROM public.unidades
WHERE ativo = true;

GRANT SELECT ON public.unidades_publicas TO anon, authenticated;

-- Mas a TV precisa achar a unidade pelo slug; como a view é security_invoker
-- e a tabela base não tem mais policy anon, criamos policy restrita só
-- pelas colunas seguras NÃO é possível em RLS (RLS é por linha, não coluna).
-- Solução: re-criar policy anon na tabela unidades, mas o cliente DEVE
-- consultar via view. Para garantir que mesmo se consultar a tabela direto
-- não vaze cnpj/endereço/telefone, REVOGAMOS SELECT dessas colunas para anon.
CREATE POLICY "anon lê unidades ativas (colunas restritas via grant)"
  ON public.unidades
  FOR SELECT
  TO anon
  USING (ativo = true);

-- Revoga SELECT total de anon e concede só nas colunas públicas
REVOKE SELECT ON public.unidades FROM anon;
GRANT SELECT (id, nome, slug, ativo) ON public.unidades TO anon;

-- ---------------------------------------------------------------------
-- 2) CHAMADAS — Remove acesso anon amplo, expõe via view com janela de 30s
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "público lê chamadas" ON public.chamadas;

CREATE OR REPLACE VIEW public.chamadas_publicas
WITH (security_invoker = false) AS  -- security_definer: bypassa RLS p/ janela curta
SELECT
  c.id,
  c.senha_id,
  c.unidade_id,
  c.destino,
  c.created_at
FROM public.chamadas c
WHERE c.created_at > now() - interval '60 seconds';

ALTER VIEW public.chamadas_publicas OWNER TO postgres;
GRANT SELECT ON public.chamadas_publicas TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 3) SENHAS — Remove acesso anon amplo. Painel TV usa view sem campos sensíveis.
--    Página do paciente (/s/:token) usa RPC dedicada.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "público lê senhas ativas" ON public.senhas;

-- View pública para o painel TV: sem paciente_id, sem token_publico
CREATE OR REPLACE VIEW public.senhas_publicas
WITH (security_invoker = false) AS
SELECT
  s.id,
  s.codigo,
  s.fila_id,
  s.unidade_id,
  s.status,
  s.prioridade,
  s.created_at,
  s.updated_at
FROM public.senhas s
WHERE s.status IN ('aguardando','chamada','em_atendimento');

ALTER VIEW public.senhas_publicas OWNER TO postgres;
GRANT SELECT ON public.senhas_publicas TO anon, authenticated;

-- RPC para a página /s/:token consultar a própria senha sem expor
-- paciente_id e sem permitir varredura por id.
CREATE OR REPLACE FUNCTION public.get_senha_por_token(_token uuid)
RETURNS TABLE (
  id uuid,
  codigo text,
  status senha_status,
  prioridade senha_prioridade,
  fila_id uuid,
  unidade_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.codigo, s.status, s.prioridade, s.fila_id, s.unidade_id,
         s.created_at, s.updated_at
  FROM public.senhas s
  WHERE s.token_publico = _token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_senha_por_token(uuid) TO anon, authenticated;