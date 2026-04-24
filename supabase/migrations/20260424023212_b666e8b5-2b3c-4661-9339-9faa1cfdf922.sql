-- Fix ensure_fila_guiche to use a more specific prefix to avoid conflicts
CREATE OR REPLACE FUNCTION public.ensure_fila_guiche(_unidade_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_fila_id uuid;
BEGIN
  -- Tenta encontrar a fila de recepção/guichê pelo tipo
  SELECT id INTO v_fila_id FROM public.filas
   WHERE unidade_id = _unidade_id AND tipo = 'guiche'::public.fila_tipo LIMIT 1;
  
  -- Se não encontrar, cria uma nova com prefixo 'PRE' para evitar conflito com 'G' (Guichês normais)
  IF v_fila_id IS NULL THEN
    INSERT INTO public.filas (unidade_id, nome, tipo, prefixo_senha, cor, ordem, ativa)
    VALUES (_unidade_id, 'Recepção', 'guiche'::public.fila_tipo, 'PRE', '#6366F1', 0, true)
    RETURNING id INTO v_fila_id;
  END IF;
  
  RETURN v_fila_id;
END $function$;

-- Drop the function with both possible signatures to be safe before recreating
DROP FUNCTION IF EXISTS public.gerar_senha_guiche(uuid, text, text, date, public.senha_prioridade);
DROP FUNCTION IF EXISTS public.gerar_senha_guiche(uuid, text, text, date, public.senha_prioridade, jsonb);

-- Restore the correct function signature (6 parameters)
CREATE OR REPLACE FUNCTION public.gerar_senha_guiche(
  _unidade_id uuid,
  _nome text,
  _telefone text DEFAULT NULL,
  _data_nascimento date DEFAULT NULL,
  _prioridade public.senha_prioridade DEFAULT 'normal',
  _triagem_dados jsonb DEFAULT NULL
)
RETURNS public.senhas
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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

  -- Busca ou cria paciente
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

  -- Garante que existe a fila de recepção
  v_fila_id := public.ensure_fila_guiche(_unidade_id);

  -- Gera a senha
  SELECT * INTO v_senha
  FROM public.gerar_senha(
    _fila_id => v_fila_id,
    _prioridade => _prioridade,
    _paciente_id => v_paciente_id,
    _origem => 'pre_atendimento'
  );

  -- Atualiza com dados de triagem se fornecidos
  IF _triagem_dados IS NOT NULL THEN
    UPDATE public.senhas
    SET triagem_dados = _triagem_dados
    WHERE id = v_senha.id;
    v_senha.triagem_dados := _triagem_dados;
  END IF;

  RETURN v_senha;
END;
$$;