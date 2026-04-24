-- Function for unit admins to list their unit's audit logs
CREATE OR REPLACE FUNCTION public.unidade_listar_auditoria(
  _unidade_id uuid,
  _entidade text DEFAULT NULL,
  _desde timestamp with time zone DEFAULT NULL,
  _ate timestamp with time zone DEFAULT NULL,
  _limite integer DEFAULT 200,
  _busca text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  unidade_id uuid,
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
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _busca_norm text;
BEGIN
  -- Security check: User must be admin or gestor of the unit
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND unidade_id = _unidade_id
      AND role IN ('admin', 'gestor', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Acesso negado: permissões insuficientes para ver auditoria desta unidade';
  END IF;

  _busca_norm := NULLIF(trim(_busca), '');

  RETURN QUERY
  SELECT
    a.id, a.unidade_id,
    a.entidade, a.acao, a.entidade_id,
    a.ator_id, a.ator_nome,
    a.resumo, a.dados_antes, a.dados_depois,
    a.created_at
  FROM public.audit_log a
  WHERE a.unidade_id = _unidade_id
    AND (_entidade IS NULL OR a.entidade = _entidade)
    AND (_desde IS NULL OR a.created_at >= _desde)
    AND (_ate IS NULL OR a.created_at <= _ate)
    AND (
      _busca_norm IS NULL
      OR a.resumo ILIKE '%' || _busca_norm || '%'
      OR COALESCE(a.ator_nome, '') ILIKE '%' || _busca_norm || '%'
    )
  ORDER BY a.created_at DESC
  LIMIT GREATEST(1, LEAST(_limite, 1000));
END;
$$;
