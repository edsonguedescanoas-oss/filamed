CREATE OR REPLACE FUNCTION public.gerar_senha(
  _fila_id UUID,
  _prioridade public.senha_prioridade DEFAULT 'normal',
  _paciente_id UUID DEFAULT NULL,
  _origem TEXT DEFAULT 'recepcao'
)
RETURNS public.senhas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _fila public.filas;
  _novo_contador INT;
  _codigo TEXT;
  _senha public.senhas;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Trava a fila para evitar race condition no contador
  SELECT * INTO _fila FROM public.filas WHERE id = _fila_id FOR UPDATE;
  IF _fila IS NULL THEN
    RAISE EXCEPTION 'Fila não encontrada';
  END IF;
  IF NOT _fila.ativa THEN
    RAISE EXCEPTION 'Fila está inativa';
  END IF;

  -- Permissão: admin ou recepção da unidade da fila
  IF NOT (
    public.has_role_in_unidade(_user_id, _fila.unidade_id, 'admin'::app_role)
    OR public.has_role_in_unidade(_user_id, _fila.unidade_id, 'recepcao'::app_role)
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

  _codigo := _fila.prefixo_senha || lpad(_novo_contador::text, 3, '0');

  INSERT INTO public.senhas (
    unidade_id, fila_id, codigo, prioridade, paciente_id, origem, status
  ) VALUES (
    _fila.unidade_id, _fila_id, _codigo, _prioridade, _paciente_id, _origem, 'aguardando'
  )
  RETURNING * INTO _senha;

  RETURN _senha;
END;
$$;