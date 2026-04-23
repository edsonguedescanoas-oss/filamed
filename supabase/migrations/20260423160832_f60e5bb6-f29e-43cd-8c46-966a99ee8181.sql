-- =============================================
-- Triggers de auditoria para assinaturas
-- =============================================
CREATE OR REPLACE FUNCTION public._audit_assinaturas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid UUID := auth.uid();
  _resumo TEXT;
  _plano_nome_old TEXT;
  _plano_nome_new TEXT;
  _unidade_nome TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT nome INTO _plano_nome_new FROM public.planos WHERE id = NEW.plano_id;
    SELECT nome INTO _unidade_nome FROM public.unidades WHERE id = NEW.unidade_id;
    _resumo := 'Assinatura criada para ' || COALESCE(_unidade_nome, '?') ||
               ' — plano ' || COALESCE(_plano_nome_new, '?') ||
               ' (' || NEW.ciclo || ', status ' || NEW.status || ')';
    INSERT INTO public.audit_log (unidade_id, entidade, acao, entidade_id, ator_id, ator_nome, resumo, dados_depois)
    VALUES (NEW.unidade_id, 'assinatura', 'criar', NEW.id, _uid, _audit_ator_nome(_uid), _resumo,
      jsonb_build_object('plano_id', NEW.plano_id, 'plano_nome', _plano_nome_new,
                         'ciclo', NEW.ciclo, 'status', NEW.status, 'gateway', NEW.gateway));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Mudança de plano
    IF NEW.plano_id IS DISTINCT FROM OLD.plano_id THEN
      SELECT nome INTO _plano_nome_old FROM public.planos WHERE id = OLD.plano_id;
      SELECT nome INTO _plano_nome_new FROM public.planos WHERE id = NEW.plano_id;
      _resumo := 'Plano alterado: ' || COALESCE(_plano_nome_old, '?') || ' → ' || COALESCE(_plano_nome_new, '?');
      INSERT INTO public.audit_log (unidade_id, entidade, acao, entidade_id, ator_id, ator_nome, resumo, dados_antes, dados_depois)
      VALUES (NEW.unidade_id, 'assinatura', 'trocar_plano', NEW.id, _uid, _audit_ator_nome(_uid), _resumo,
        jsonb_build_object('plano_id', OLD.plano_id, 'plano_nome', _plano_nome_old),
        jsonb_build_object('plano_id', NEW.plano_id, 'plano_nome', _plano_nome_new));
    END IF;

    -- Mudança de ciclo
    IF NEW.ciclo IS DISTINCT FROM OLD.ciclo THEN
      _resumo := 'Ciclo de cobrança alterado: ' || OLD.ciclo || ' → ' || NEW.ciclo;
      INSERT INTO public.audit_log (unidade_id, entidade, acao, entidade_id, ator_id, ator_nome, resumo, dados_antes, dados_depois)
      VALUES (NEW.unidade_id, 'assinatura', 'mudar_ciclo', NEW.id, _uid, _audit_ator_nome(_uid), _resumo,
        jsonb_build_object('ciclo', OLD.ciclo), jsonb_build_object('ciclo', NEW.ciclo));
    END IF;

    -- Mudança de status
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      _resumo := 'Status da assinatura: ' || OLD.status || ' → ' || NEW.status;
      INSERT INTO public.audit_log (unidade_id, entidade, acao, entidade_id, ator_id, ator_nome, resumo, dados_antes, dados_depois)
      VALUES (NEW.unidade_id, 'assinatura',
        CASE WHEN NEW.status = 'cancelada' THEN 'cancelar'
             WHEN NEW.status = 'ativa' AND OLD.status IN ('cancelada','pausada','inadimplente') THEN 'reativar'
             ELSE 'mudar_status' END,
        NEW.id, _uid, _audit_ator_nome(_uid), _resumo,
        jsonb_build_object('status', OLD.status), jsonb_build_object('status', NEW.status));
    END IF;

    -- Agendamento de cancelamento
    IF NEW.cancelar_no_fim_do_ciclo IS DISTINCT FROM OLD.cancelar_no_fim_do_ciclo
       AND NEW.cancelar_no_fim_do_ciclo = true THEN
      _resumo := 'Cancelamento agendado para o fim do ciclo';
      INSERT INTO public.audit_log (unidade_id, entidade, acao, entidade_id, ator_id, ator_nome, resumo, dados_depois)
      VALUES (NEW.unidade_id, 'assinatura', 'agendar_cancelamento', NEW.id, _uid, _audit_ator_nome(_uid), _resumo,
        jsonb_build_object('proximo_ciclo_em', NEW.proximo_ciclo_em));
    END IF;

    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_assinaturas ON public.assinaturas;
CREATE TRIGGER trg_audit_assinaturas
AFTER INSERT OR UPDATE ON public.assinaturas
FOR EACH ROW EXECUTE FUNCTION public._audit_assinaturas();

-- =============================================
-- Triggers de auditoria para unidades (suspensão/reativação)
-- =============================================
CREATE OR REPLACE FUNCTION public._audit_unidades()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid UUID := auth.uid();
  _resumo TEXT;
  _acao TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _resumo := 'Unidade criada: ' || NEW.nome;
    INSERT INTO public.audit_log (unidade_id, entidade, acao, entidade_id, ator_id, ator_nome, resumo, dados_depois)
    VALUES (NEW.id, 'unidade', 'criar', NEW.id, _uid, _audit_ator_nome(_uid), _resumo,
      jsonb_build_object('nome', NEW.nome, 'slug', NEW.slug, 'status_assinatura', NEW.status_assinatura));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Mudança de ativo (suspensão/reativação)
    IF NEW.ativo IS DISTINCT FROM OLD.ativo THEN
      _acao := CASE WHEN NEW.ativo THEN 'reativar' ELSE 'suspender' END;
      _resumo := 'Unidade ' || NEW.nome || (CASE WHEN NEW.ativo THEN ' reativada' ELSE ' suspensa' END);
      INSERT INTO public.audit_log (unidade_id, entidade, acao, entidade_id, ator_id, ator_nome, resumo, dados_antes, dados_depois)
      VALUES (NEW.id, 'unidade', _acao, NEW.id, _uid, _audit_ator_nome(_uid), _resumo,
        jsonb_build_object('ativo', OLD.ativo), jsonb_build_object('ativo', NEW.ativo));
    END IF;

    -- Mudança de status_assinatura
    IF NEW.status_assinatura IS DISTINCT FROM OLD.status_assinatura THEN
      _resumo := 'Status da unidade ' || NEW.nome || ': ' || OLD.status_assinatura || ' → ' || NEW.status_assinatura;
      INSERT INTO public.audit_log (unidade_id, entidade, acao, entidade_id, ator_id, ator_nome, resumo, dados_antes, dados_depois)
      VALUES (NEW.id, 'unidade', 'mudar_status', NEW.id, _uid, _audit_ator_nome(_uid), _resumo,
        jsonb_build_object('status_assinatura', OLD.status_assinatura),
        jsonb_build_object('status_assinatura', NEW.status_assinatura));
    END IF;

    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_unidades ON public.unidades;
CREATE TRIGGER trg_audit_unidades
AFTER INSERT OR UPDATE ON public.unidades
FOR EACH ROW EXECUTE FUNCTION public._audit_unidades();

-- =============================================
-- admin_listar_auditoria com busca textual e filtro por ator
-- =============================================
CREATE OR REPLACE FUNCTION public.admin_listar_auditoria(
  _unidade_id uuid DEFAULT NULL,
  _entidade text DEFAULT NULL,
  _desde timestamp with time zone DEFAULT NULL,
  _ate timestamp with time zone DEFAULT NULL,
  _limite integer DEFAULT 200,
  _busca text DEFAULT NULL,
  _ator_id uuid DEFAULT NULL
)
RETURNS TABLE(
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
STABLE SECURITY DEFINER
SET search_path TO 'public'
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
    a.ator_id, a.ator_nome,
    a.resumo, a.dados_antes, a.dados_depois,
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
    )
  ORDER BY a.created_at DESC
  LIMIT GREATEST(1, LEAST(_limite, 2000));
END;
$$;