-- Atualiza a função para ser case-insensitive na busca pelo slug
CREATE OR REPLACE FUNCTION public.get_unidade_publica_by_slug(_slug text)
RETURNS TABLE (id uuid, nome text, slug text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.nome, u.slug
  FROM public.unidades u
  WHERE LOWER(u.slug) = LOWER(_slug) 
    AND u.ativo = true
  LIMIT 1;
$$;

-- Garante permissão de execução para o papel público (TV anônima)
GRANT EXECUTE ON FUNCTION public.get_unidade_publica_by_slug(text) TO anon, authenticated;