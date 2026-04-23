-- ============================================================
-- 1. TABELA DE AUDITORIA GLOBAL
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unidade_id UUID,
  entidade TEXT NOT NULL,           -- 'fila', 'chamada', 'notificacao', 'senha', 'assinatura'
  acao TEXT NOT NULL,               -- 'criar', 'atualizar', 'remover', 'status', 'enviar', 'falhar'
  entidade_id UUID,
  ator_id UUID,                     -- auth.uid() quando disponível
  ator_nome TEXT,                   -- snapshot do nome no momento da ação
  resumo TEXT NOT NULL,             -- descrição legível
  dados_antes JSONB,
  dados_depois JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_unidade_created ON public.audit_log (unidade_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entidade ON public.audit_log (entidade, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log (created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Apenas super admins leem/gerenciam
CREATE POLICY "super admin lê auditoria"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Ninguém faz INSERT/UPDATE/DELETE direto: triggers usam SECURITY DEFINER
-- (sem políticas adicionais = bloqueado para clients)

-- ============================================================
-- 2. HELPER PARA NOME DO ATOR
-- ============================================================

CREATE OR REPLACE FUNCTION public._audit_ator_nome(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nome_completo FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- ============================================================
-- 3. TRIGGER: FILAS (INSERT / UPDATE / DELETE)
-- ============================================================

CREATE OR REPLACE FUNCTION public._audit_filas()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _resumo TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _resumo := 'Fila criada: ' || NEW.nome || ' (prefixo ' || NEW.prefixo_senha || ')';
    INSERT INTO public.audit_log (unidade_id, entidade, acao, entidade_id, ator_id, ator_nome, resumo, dados_depois)
    VALUES (NEW.unidade_id, 'fila', 'criar', NEW.id, _uid, _audit_ator_nome(_uid), _resumo, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Só audita se houve mudança relevante (ignora apenas updated_at / contador)
    IF NEW.nome IS DISTINCT FROM OLD.nome
       OR NEW.ativa IS DISTINCT FROM OLD.ativa
       OR NEW.prefixo_senha IS DISTINCT FROM OLD.prefixo_senha
       OR NEW.tipo IS DISTINCT FROM OLD.tipo
       OR NEW.cor IS DISTINCT FROM OLD.cor
       OR NEW.ordem IS DISTINCT FROM OLD.ordem
       OR NEW.tempo_espera_estimado IS DISTINCT FROM OLD.tempo_espera_estimado THEN
      _resumo := CASE
        WHEN NEW.ativa IS DISTINCT FROM OLD.ativa THEN
          'Fila ' || NEW.nome || ' ' || (CASE WHEN NEW.ativa THEN 'reativada' ELSE 'desativada' END)
        ELSE
          'Fila atualizada: ' || NEW.nome
      END;
      INSERT INTO public.audit_log (unidade_id, entidade, acao, entidade_id, ator_id, ator_nome, resumo, dados_antes, dados_depois)
      VALUES (NEW.unidade_id, 'fila', 'atualizar', NEW.id, _uid, _audit_ator_nome(_uid), _resumo, to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    _resumo := 'Fila removida: ' || OLD.nome;
    INSERT INTO public.audit_log (unidade_id, entidade, acao, entidade_id, ator_id, ator_nome, resumo, dados_antes)
    VALUES (OLD.unidade_id, 'fila', 'remover', OLD.id, _uid, _audit_ator_nome(_uid), _resumo, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_filas ON public.filas;
CREATE TRIGGER trg_audit_filas
AFTER INSERT OR UPDATE OR DELETE ON public.filas
FOR EACH ROW EXECUTE FUNCTION public._audit_filas();

-- ============================================================
-- 4. TRIGGER: CHAMADAS (INSERT)
-- ============================================================

CREATE OR REPLACE FUNCTION public._audit_chamadas()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _codigo TEXT;
  _resumo TEXT;
BEGIN
  SELECT codigo INTO _codigo FROM public.senhas WHERE id = NEW.senha_id;
  _resumo := 'Senha ' || COALESCE(_codigo, '?') || ' chamada para ' || NEW.destino;

  INSERT INTO public.audit_log (unidade_id, entidade, acao, entidade_id, ator_id, ator_nome, resumo, dados_depois)
  VALUES (
    NEW.unidade_id, 'chamada', 'chamar', NEW.senha_id,
    NEW.chamado_por, _audit_ator_nome(NEW.chamado_por),
    _resumo,
    jsonb_build_object('senha_codigo', _codigo, 'destino', NEW.destino, 'observacao', NEW.observacao)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_chamadas ON public.chamadas;
CREATE TRIGGER trg_audit_chamadas
AFTER INSERT ON public.chamadas
FOR EACH ROW EXECUTE FUNCTION public._audit_chamadas();

-- ============================================================
-- 5. TRIGGER: NOTIFICAÇÕES (status enviada/falhou)
-- ============================================================

CREATE OR REPLACE FUNCTION public._audit_notificacoes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _resumo TEXT;
  _acao TEXT;
BEGIN
  -- Audita só transição de status para enviada / falhou (evita ruído de pendente)
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'enviada' THEN
      _acao := 'enviar';
      _resumo := 'Notificação ' || NEW.canal || ' enviada para ' || NEW.destinatario;
    ELSIF NEW.status = 'falhou' THEN
      _acao := 'falhar';
      _resumo := 'Falha ao enviar ' || NEW.canal || ' para ' || NEW.destinatario || COALESCE(' — ' || NEW.erro, '');
    ELSE
      RETURN NEW; -- pendente / ignorado: não audita
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
      RETURN NEW;
    END IF;
    IF NEW.status = 'enviada' THEN
      _acao := 'enviar';
      _resumo := 'Notificação ' || NEW.canal || ' enviada para ' || NEW.destinatario;
    ELSIF NEW.status = 'falhou' THEN
      _acao := 'falhar';
      _resumo := 'Falha ao enviar ' || NEW.canal || ' para ' || NEW.destinatario || COALESCE(' — ' || NEW.erro, '');
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.audit_log (unidade_id, entidade, acao, entidade_id, ator_id, ator_nome, resumo, dados_depois)
  VALUES (
    NEW.unidade_id, 'notificacao', _acao, NEW.id,
    NULL, NULL,  -- sistema/edge function
    _resumo,
    jsonb_build_object(
      'canal', NEW.canal,
      'destinatario', NEW.destinatario,
      'status', NEW.status,
      'tentativas', NEW.tentativas,
      'erro', NEW.erro,
      'senha_id', NEW.senha_id
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_notificacoes ON public.notificacoes_log;
CREATE TRIGGER trg_audit_notificacoes
AFTER INSERT OR UPDATE ON public.notificacoes_log
FOR EACH ROW EXECUTE FUNCTION public._audit_notificacoes();

-- ============================================================
-- 6. RPC PARA O ADMIN CONSULTAR
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_listar_auditoria(
  _unidade_id UUID DEFAULT NULL,
  _entidade TEXT DEFAULT NULL,
  _desde TIMESTAMPTZ DEFAULT NULL,
  _ate TIMESTAMPTZ DEFAULT NULL,
  _limite INT DEFAULT 200
)
RETURNS TABLE (
  id UUID,
  unidade_id UUID,
  unidade_nome TEXT,
  entidade TEXT,
  acao TEXT,
  entidade_id UUID,
  ator_id UUID,
  ator_nome TEXT,
  resumo TEXT,
  dados_antes JSONB,
  dados_depois JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas super admins podem acessar a auditoria';
  END IF;

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
  ORDER BY a.created_at DESC
  LIMIT GREATEST(1, LEAST(_limite, 1000));
END;
$$;