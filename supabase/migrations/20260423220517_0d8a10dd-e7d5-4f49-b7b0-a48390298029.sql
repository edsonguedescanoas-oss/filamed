ALTER TABLE public.unidades
ADD COLUMN IF NOT EXISTS google_review_url text;

CREATE OR REPLACE FUNCTION public.encaminhar_do_guiche(
  _senha_guiche_id uuid,
  _fila_destino_id uuid,
  _tipo text DEFAULT 'avulso'::text,
  _observacoes text DEFAULT NULL::text,
  _prioridade public.senha_prioridade DEFAULT 'normal'::public.senha_prioridade
)
RETURNS public.senhas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_senha public.senhas%ROWTYPE;
  v_fila public.filas%ROWTYPE;
  v_ponto_id uuid;
  v_novo_codigo text;
BEGIN
  SELECT * INTO v_senha
  FROM public.senhas
  WHERE id = _senha_guiche_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Senha do guichê não encontrada';
  END IF;

  SELECT * INTO v_fila
  FROM public.filas
  WHERE id = _fila_destino_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fila destino não encontrada';
  END IF;

  IF v_fila.unidade_id <> v_senha.unidade_id THEN
    RAISE EXCEPTION 'Fila destino pertence a outra unidade';
  END IF;

  IF NOT public.belongs_to_unidade(auth.uid(), v_senha.unidade_id) THEN
    RAISE EXCEPTION 'Sem permissão para esta unidade';
  END IF;

  UPDATE public.filas
  SET contador_senha = contador_senha + 1,
      updated_at = now()
  WHERE id = _fila_destino_id
  RETURNING prefixo_senha || LPAD(contador_senha::text, 3, '0') INTO v_novo_codigo;

  UPDATE public.senhas
  SET fila_id = _fila_destino_id,
      codigo = v_novo_codigo,
      prioridade = COALESCE(_prioridade, prioridade),
      status = 'aguardando'::public.senha_status,
      origem = 'guiche',
      updated_at = now()
  WHERE id = _senha_guiche_id
  RETURNING * INTO v_senha;

  SELECT ponto_atendimento_id INTO v_ponto_id
  FROM public.profiles
  WHERE id = auth.uid();

  INSERT INTO public.guiche_atendimentos (
    unidade_id, senha_id, ponto_atendimento_id,
    fila_destino_id, senha_destino_id, tipo, observacoes, atendido_por
  ) VALUES (
    v_senha.unidade_id, _senha_guiche_id, v_ponto_id,
    _fila_destino_id, _senha_guiche_id, _tipo, _observacoes, auth.uid()
  );

  RETURN v_senha;
END
$function$;