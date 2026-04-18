CREATE OR REPLACE FUNCTION public.setup_initial_unidade(
  _nome TEXT,
  _slug TEXT DEFAULT NULL,
  _cnpj TEXT DEFAULT NULL,
  _endereco TEXT DEFAULT NULL,
  _telefone TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _existing_unidade UUID;
  _new_unidade_id UUID;
  _final_slug TEXT;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Bloqueia se já estiver vinculado a uma unidade
  SELECT unidade_id INTO _existing_unidade
  FROM public.profiles
  WHERE id = _user_id;

  IF _existing_unidade IS NOT NULL THEN
    RAISE EXCEPTION 'Usuário já está vinculado a uma unidade';
  END IF;

  -- Slug: usa o fornecido ou gera a partir do nome
  _final_slug := COALESCE(
    NULLIF(trim(_slug), ''),
    lower(regexp_replace(unaccent_simple(_nome), '[^a-zA-Z0-9]+', '-', 'g'))
  );
  -- Garante unicidade adicionando sufixo se já existir
  IF EXISTS (SELECT 1 FROM public.unidades WHERE slug = _final_slug) THEN
    _final_slug := _final_slug || '-' || substr(gen_random_uuid()::text, 1, 6);
  END IF;

  -- Cria a unidade
  INSERT INTO public.unidades (nome, slug, cnpj, endereco, telefone)
  VALUES (trim(_nome), _final_slug, _cnpj, _endereco, _telefone)
  RETURNING id INTO _new_unidade_id;

  -- Vincula o profile
  UPDATE public.profiles
  SET unidade_id = _new_unidade_id
  WHERE id = _user_id;

  -- Atribui papel de admin
  INSERT INTO public.user_roles (user_id, unidade_id, role)
  VALUES (_user_id, _new_unidade_id, 'admin');

  RETURN _new_unidade_id;
END;
$$;

-- Função auxiliar simples para "remover acentos" sem extensão (suficiente p/ slug)
CREATE OR REPLACE FUNCTION public.unaccent_simple(_text TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
SET search_path = public
AS $$
  SELECT translate(
    _text,
    'áàâãäåÁÀÂÃÄÅéèêëÉÈÊËíìîïÍÌÎÏóòôõöÓÒÔÕÖúùûüÚÙÛÜçÇñÑ',
    'aaaaaaAAAAAAeeeeEEEEiiiiIIIIoooooOOOOOuuuuUUUUcCnN'
  )
$$;

GRANT EXECUTE ON FUNCTION public.setup_initial_unidade(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;