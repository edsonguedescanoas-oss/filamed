-- Audit function for profiles
CREATE OR REPLACE FUNCTION public._audit_profiles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid UUID := auth.uid();
  _resumo TEXT;
  _entidade_id UUID := COALESCE(NEW.id, OLD.id);
  _unidade_id UUID := COALESCE(NEW.unidade_id, OLD.unidade_id);
BEGIN
  -- We only log if there is an authenticated user (the actor)
  -- and if the actor is NOT the same as the user being modified (unless it's a deletion/creation)
  -- Actually, let's log everything and filter in UI if needed, or just exclude self-edits for "admin" logs.
  
  IF TG_OP = 'INSERT' THEN
    _resumo := 'Perfil criado: ' || NEW.nome_completo;
    INSERT INTO public.audit_log (unidade_id, entidade, acao, entidade_id, ator_id, ator_nome, resumo, dados_depois)
    VALUES (_unidade_id, 'usuario', 'criar', _entidade_id, _uid, _audit_ator_nome(_uid), _resumo,
      jsonb_build_object('nome_completo', NEW.nome_completo, 'ativo', NEW.ativo));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Only log if an admin is editing someone else, or if it's a critical change
    IF _uid IS DISTINCT FROM NEW.id THEN
      IF NEW.nome_completo IS DISTINCT FROM OLD.nome_completo OR 
         NEW.ativo IS DISTINCT FROM OLD.ativo OR 
         NEW.telefone IS DISTINCT FROM OLD.telefone THEN
        
        _resumo := 'Usuário editado: ' || NEW.nome_completo;
        INSERT INTO public.audit_log (unidade_id, entidade, acao, entidade_id, ator_id, ator_nome, resumo, dados_antes, dados_depois)
        VALUES (_unidade_id, 'usuario', 'editar', _entidade_id, _uid, _audit_ator_nome(_uid), _resumo,
          jsonb_build_object('nome_completo', OLD.nome_completo, 'ativo', OLD.ativo, 'telefone', OLD.telefone),
          jsonb_build_object('nome_completo', NEW.nome_completo, 'ativo', NEW.ativo, 'telefone', NEW.telefone));
      END IF;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    _resumo := 'Usuário excluído: ' || OLD.nome_completo;
    INSERT INTO public.audit_log (unidade_id, entidade, acao, entidade_id, ator_id, ator_nome, resumo, dados_antes)
    VALUES (_unidade_id, 'usuario', 'excluir', _entidade_id, _uid, _audit_ator_nome(_uid), _resumo,
      jsonb_build_object('nome_completo', OLD.nome_completo));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger for profiles
CREATE TRIGGER trg_audit_profiles
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public._audit_profiles();

-- Audit function for user_roles
CREATE OR REPLACE FUNCTION public._audit_user_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid UUID := auth.uid();
  _resumo TEXT;
  _target_name TEXT;
  _entidade_id UUID := COALESCE(NEW.user_id, OLD.user_id);
  _unidade_id UUID := COALESCE(NEW.unidade_id, OLD.unidade_id);
BEGIN
  _target_name := _audit_ator_nome(_entidade_id);

  IF TG_OP = 'INSERT' THEN
    _resumo := 'Cargo atribuído ao usuário ' || COALESCE(_target_name, _entidade_id::text) || ': ' || NEW.role;
    INSERT INTO public.audit_log (unidade_id, entidade, acao, entidade_id, ator_id, ator_nome, resumo, dados_depois)
    VALUES (_unidade_id, 'usuario', 'atribuir_cargo', _entidade_id, _uid, _audit_ator_nome(_uid), _resumo,
      jsonb_build_object('role', NEW.role));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      _resumo := 'Cargo do usuário ' || COALESCE(_target_name, _entidade_id::text) || ' alterado: ' || OLD.role || ' → ' || NEW.role;
      INSERT INTO public.audit_log (unidade_id, entidade, acao, entidade_id, ator_id, ator_nome, resumo, dados_antes, dados_depois)
      VALUES (_unidade_id, 'usuario', 'mudar_cargo', _entidade_id, _uid, _audit_ator_nome(_uid), _resumo,
        jsonb_build_object('role', OLD.role), jsonb_build_object('role', NEW.role));
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    _resumo := 'Cargo removido do usuário ' || COALESCE(_target_name, _entidade_id::text) || ': ' || OLD.role;
    INSERT INTO public.audit_log (unidade_id, entidade, acao, entidade_id, ator_id, ator_nome, resumo, dados_antes)
    VALUES (_unidade_id, 'usuario', 'remover_cargo', _entidade_id, _uid, _audit_ator_nome(_uid), _resumo,
      jsonb_build_object('role', OLD.role));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger for user_roles
CREATE TRIGGER trg_audit_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public._audit_user_roles();

-- Audit function for invitations
CREATE OR REPLACE FUNCTION public._audit_invitations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid UUID := auth.uid();
  _resumo TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _resumo := 'Usuário convidado: ' || NEW.email || ' com perfil ' || NEW.role;
    INSERT INTO public.audit_log (unidade_id, entidade, acao, entidade_id, ator_id, ator_nome, resumo, dados_depois)
    VALUES (NEW.unidade_id, 'usuario', 'convidar', NEW.id, _uid, _audit_ator_nome(_uid), _resumo,
      jsonb_build_object('email', NEW.email, 'role', NEW.role));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger for invitations
CREATE TRIGGER trg_audit_invitations
AFTER INSERT ON public.invitations
FOR EACH ROW EXECUTE FUNCTION public._audit_invitations();
