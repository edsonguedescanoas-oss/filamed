CREATE OR REPLACE FUNCTION public.gerar_senha_guiche(
  _unidade_id uuid,
  _nome text,
  _telefone text DEFAULT NULL::text,
  _data_nascimento date DEFAULT NULL::date,
  _prioridade public.senha_prioridade DEFAULT 'normal'::public.senha_prioridade
)
RETURNS public.senhas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_paciente_id uuid;
  v_fila_id uuid;
  v_senha public.senhas;
BEGIN
  IF NOT public.belongs_to_unidade(auth.uid(), _unidade_id) THEN
    RAISE EXCEPTION 'Sem permissão para esta unidade';
  END IF;

  IF _nome IS NULL OR length(trim(_nome)) < 2 THEN
    RAISE EXCEPTION 'Nome obrigatório';
  END IF;

  IF _telefone IS NOT NULL AND length(trim(_telefone)) > 0 THEN
    SELECT id INTO v_paciente_id
    FROM public.pacientes
    WHERE unidade_id = _unidade_id
      AND telefone = _telefone
    LIMIT 1;
  END IF;

  IF v_paciente_id IS NULL THEN
    INSERT INTO public.pacientes (unidade_id, nome_completo, telefone, data_nascimento)
    VALUES (_unidade_id, trim(_nome), _telefone, _data_nascimento)
    RETURNING id INTO v_paciente_id;
  ELSE
    UPDATE public.pacientes
    SET nome_completo = trim(_nome),
        data_nascimento = COALESCE(_data_nascimento, data_nascimento),
        updated_at = now()
    WHERE id = v_paciente_id;
  END IF;

  v_fila_id := public.ensure_fila_guiche(_unidade_id);

  SELECT * INTO v_senha
  FROM public.gerar_senha(
    _fila_id => v_fila_id,
    _prioridade => _prioridade,
    _paciente_id => v_paciente_id,
    _origem => 'pre_atendimento'
  );

  RETURN v_senha;
END
$function$;