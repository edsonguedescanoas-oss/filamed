-- Função para buscar chamadas recentes com detalhes da senha e fila
CREATE OR REPLACE FUNCTION public.get_chamadas_recentes_detalhadas(_unidade_id uuid)
RETURNS TABLE (
    id uuid,
    senha_id uuid,
    unidade_id uuid,
    destino text,
    created_at timestamp with time zone,
    senha_codigo text,
    fila_nome text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id, 
    c.senha_id, 
    c.unidade_id, 
    c.destino, 
    c.created_at,
    s.codigo as senha_codigo,
    f.nome as fila_nome
  FROM public.chamadas c
  JOIN public.senhas s ON c.senha_id = s.id
  JOIN public.filas f ON s.fila_id = f.id
  WHERE c.unidade_id = _unidade_id
    AND c.created_at > now() - interval '24 hours' -- Aumentado para 24h para garantir que sempre tenha algo no histórico inicial
  ORDER BY c.created_at DESC
  LIMIT 10;
$$;

-- Garantir permissões de execução para as funções públicas
GRANT EXECUTE ON FUNCTION public.get_unidades_publicas() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_unidade_publica_by_slug(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_chamadas_recentes(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_chamadas_recentes_detalhadas(uuid) TO anon, authenticated;

-- Ajustar políticas de RLS para tv_visual_config
DROP POLICY IF EXISTS "tv visual config é público para leitura" ON public.tv_visual_config;
CREATE POLICY "tv visual config é público para leitura" 
ON public.tv_visual_config FOR SELECT 
USING (true);

-- Garantir que anon pode ler senhas e chamadas básicas
DROP POLICY IF EXISTS "público lê chamadas recentes" ON public.chamadas;
CREATE POLICY "público lê chamadas recentes" 
ON public.chamadas FOR SELECT 
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "público lê senhas ativas" ON public.senhas;
CREATE POLICY "público lê senhas ativas" 
ON public.senhas FOR SELECT 
TO anon, authenticated
USING (true);
