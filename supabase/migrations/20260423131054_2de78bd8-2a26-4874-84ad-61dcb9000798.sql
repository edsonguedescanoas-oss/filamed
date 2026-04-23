CREATE OR REPLACE FUNCTION public.gerar_senha(_fila_id uuid, _prioridade senha_prioridade DEFAULT 'normal'::senha_prioridade, _paciente_id uuid DEFAULT NULL::uuid, _origem text DEFAULT 'recepcao'::text)
 RETURNS senhas
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id UUID := auth.uid();
  _fila public.filas;
  _novo_contador INT;
  _codigo TEXT;
  _senha public.senhas;
  _is_super_admin BOOLEAN;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Verifica se é super_admin global
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = 'super_admin'::app_role
  ) INTO _is_super_admin;

  -- Trava a fila para evitar race condition no contador
  SELECT * INTO _fila FROM public.filas WHERE id = _fila_id FOR UPDATE;
  IF _fila IS NULL THEN
    RAISE EXCEPTION 'Fila não encontrada';
  END IF;
  IF NOT _fila.ativa THEN
    RAISE EXCEPTION 'Fila está inativa';
  END IF;

  -- Permissão: admin, recepção, gestor, médico ou enfermeiro da unidade ou super_admin global
  IF NOT (
    _is_super_admin
    OR public.has_role_in_unidade(_user_id, _fila.unidade_id, 'admin'::app_role)
    OR public.has_role_in_unidade(_user_id, _fila.unidade_id, 'recepcao'::app_role)
    OR public.has_role_in_unidade(_user_id, _fila.unidade_id, 'gestor'::app_role)
    OR public.has_role_in_unidade(_user_id, _fila.unidade_id, 'medico'::app_role)
    OR public.has_role_in_unidade(_user_id, _fila.unidade_id, 'enfermeiro'::app_role)
  ) THEN
    RAISE EXCEPTION 'Sem permissão para gerar senhas nesta fila';
  END IF;

  -- Se paciente informado, deve pertencer à mesma unidade
  IF _paciente_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.pacientes
      WHERE id = _paciente_id AND unidade_id = _fila.unidade_id
    ) THEN
      RAISE EXCEPTION 'Paciente não pertence à mesma unidade da fila';
    END IF;
  END IF;

  -- Incrementa contador
  UPDATE public.filas
  SET contador_senha = contador_senha + 1, updated_at = now()
  WHERE id = _fila_id
  RETURNING contador_senha INTO _novo_contador;

  -- Gera código com prefixo e contador formatado
  _codigo := COALESCE(_fila.prefixo_senha, '') || lpad(_novo_contador::text, 3, '0');

  INSERT INTO public.senhas (
    unidade_id, fila_id, codigo, prioridade, paciente_id, origem, status, criado_por
  ) VALUES (
    _fila.unidade_id, _fila_id, _codigo, _prioridade, _paciente_id, _origem, 'aguardando', _user_id
  )
  RETURNING * INTO _senha;

  RETURN _senha;
END;
$function$;