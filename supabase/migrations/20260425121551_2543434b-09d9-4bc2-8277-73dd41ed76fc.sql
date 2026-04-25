CREATE OR REPLACE FUNCTION public.admin_listar_auditoria(
  _unidade_id uuid DEFAULT NULL,
  _entidade text DEFAULT NULL,
  _desde timestamp with time zone DEFAULT NULL,
  _ate timestamp with time zone DEFAULT NULL,
  _limite integer DEFAULT 50,
  _busca text DEFAULT NULL,
  _ator_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  unidade_id uuid,
  unidade_nome text,
  entidade text,
  acao text,
  entidade_id uuid,
  ator_id uuid,
  ator_nome text,
  resumo text,
  dados_antes jsonb,
  dados_depois jsonb,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _busca_norm text;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas super admins podem acessar a auditoria';
  END IF;

  _busca_norm := NULLIF(trim(_busca), '');

  RETURN QUERY
  SELECT
    a.id, a.unidade_id, u.nome,
    a.entidade, a.acao, a.entidade_id,
    a.ator_id::uuid, a.ator_nome,
    a.resumo, a.dados_antes::jsonb, a.dados_depois::jsonb,
    a.created_at
  FROM public.audit_log a
  LEFT JOIN public.unidades u ON u.id = a.unidade_id
  WHERE (_unidade_id IS NULL OR a.unidade_id = _unidade_id)
    AND (_entidade IS NULL OR a.entidade = _entidade)
    AND (_desde IS NULL OR a.created_at >= _desde)
    AND (_ate IS NULL OR a.created_at <= _ate)
    AND (_ator_id IS NULL OR a.ator_id = _ator_id)
    AND (
      _busca_norm IS NULL
      OR a.resumo ILIKE '%' || _busca_norm || '%'
      OR COALESCE(a.ator_nome, '') ILIKE '%' || _busca_norm || '%'
      OR COALESCE(u.nome, '') ILIKE '%' || _busca_norm || '%'
      -- Busca por código de senha nos dados_antes/depois (best-effort)
      OR (a.entidade = 'senhas' AND (
           a.resumo ILIKE '%' || _busca_norm || '%' OR
           (a.dados_antes->>'codigo') ILIKE '%' || _busca_norm || '%' OR
           (a.dados_depois->>'codigo') ILIKE '%' || _busca_norm || '%'
         ))
    )
  ORDER BY a.created_at DESC
  LIMIT GREATEST(1, LEAST(_limite, 2000));
END;
$$;