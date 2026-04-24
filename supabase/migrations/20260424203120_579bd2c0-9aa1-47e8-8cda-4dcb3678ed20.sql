-- Função para zerar todas as filas de uma unidade (cancela esperas, preserva histórico)
CREATE OR REPLACE FUNCTION public.zerar_filas_unidade(_unidade_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _ator uuid := auth.uid();
  _afetadas integer := 0;
  _ator_nome text;
BEGIN
  -- Validação de permissão: apenas admin ou recepção da unidade
  IF _ator IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF NOT (
    public.has_role_in_unidade(_ator, _unidade_id, 'admin'::app_role)
    OR public.has_role_in_unidade(_ator, _unidade_id, 'recepcao'::app_role)
    OR public.is_super_admin(_ator)
  ) THEN
    RAISE EXCEPTION 'Sem permissão para zerar filas desta unidade';
  END IF;

  -- Cancela todas as senhas em estados ativos
  WITH atualizadas AS (
    UPDATE public.senhas
    SET status = 'cancelada'::senha_status,
        finalizada_em = COALESCE(finalizada_em, now()),
        updated_at = now()
    WHERE unidade_id = _unidade_id
      AND status IN ('aguardando'::senha_status, 'chamada'::senha_status, 'em_atendimento'::senha_status)
    RETURNING id
  )
  SELECT count(*) INTO _afetadas FROM atualizadas;

  -- Busca nome do ator para a auditoria
  SELECT nome_completo INTO _ator_nome FROM public.profiles WHERE id = _ator;

  -- Registra na trilha de auditoria
  INSERT INTO public.audit_log (
    unidade_id, entidade, entidade_id, acao, resumo,
    ator_id, ator_nome, dados_depois
  ) VALUES (
    _unidade_id,
    'senhas',
    NULL,
    'zerar_filas',
    format('%s senha(s) cancelada(s) ao zerar as filas', _afetadas),
    _ator,
    _ator_nome,
    jsonb_build_object('senhas_canceladas', _afetadas, 'executado_em', now())
  );

  RETURN jsonb_build_object('senhas_canceladas', _afetadas);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.zerar_filas_unidade(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.zerar_filas_unidade(uuid) TO authenticated;