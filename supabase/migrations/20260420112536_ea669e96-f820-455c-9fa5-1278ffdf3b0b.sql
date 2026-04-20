-- =====================================================================
-- Substitui views SECURITY DEFINER por funções dedicadas (padrão recomendado)
-- =====================================================================

-- Limpa as views anteriores (vão ser substituídas por funções)
DROP VIEW IF EXISTS public.chamadas_publicas;
DROP VIEW IF EXISTS public.senhas_publicas;
DROP VIEW IF EXISTS public.unidades_publicas;

-- ---------------------------------------------------------------------
-- get_unidades_publicas — lista de unidades ativas (id, nome, slug)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_unidades_publicas()
RETURNS TABLE (id uuid, nome text, slug text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.nome, u.slug
  FROM public.unidades u
  WHERE u.ativo = true
  ORDER BY u.nome;
$$;

GRANT EXECUTE ON FUNCTION public.get_unidades_publicas() TO anon, authenticated;

-- ---------------------------------------------------------------------
-- get_unidade_publica_by_slug — busca uma unidade pelo slug
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_unidade_publica_by_slug(_slug text)
RETURNS TABLE (id uuid, nome text, slug text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.nome, u.slug
  FROM public.unidades u
  WHERE u.slug = _slug AND u.ativo = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_unidade_publica_by_slug(text) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- get_senhas_ativas — senhas ativas SEM paciente_id e SEM token_publico
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_senhas_ativas(_unidade_id uuid)
RETURNS TABLE (
  id uuid,
  codigo text,
  fila_id uuid,
  unidade_id uuid,
  status senha_status,
  prioridade senha_prioridade,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.codigo, s.fila_id, s.unidade_id, s.status, s.prioridade,
         s.created_at, s.updated_at
  FROM public.senhas s
  WHERE s.unidade_id = _unidade_id
    AND s.status IN ('aguardando','chamada','em_atendimento')
  ORDER BY s.created_at;
$$;

GRANT EXECUTE ON FUNCTION public.get_senhas_ativas(uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- get_chamadas_recentes — chamadas dos últimos 60s (apenas para piscar TV)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_chamadas_recentes(_unidade_id uuid)
RETURNS TABLE (
  id uuid,
  senha_id uuid,
  unidade_id uuid,
  destino text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.senha_id, c.unidade_id, c.destino, c.created_at
  FROM public.chamadas c
  WHERE c.unidade_id = _unidade_id
    AND c.created_at > now() - interval '60 seconds'
  ORDER BY c.created_at DESC
  LIMIT 20;
$$;

GRANT EXECUTE ON FUNCTION public.get_chamadas_recentes(uuid) TO anon, authenticated;