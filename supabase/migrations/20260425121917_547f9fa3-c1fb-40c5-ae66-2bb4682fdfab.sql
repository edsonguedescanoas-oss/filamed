CREATE OR REPLACE FUNCTION public.admin_criar_unidade(
  _nome text,
  _slug text DEFAULT NULL,
  _cnpj text DEFAULT NULL,
  _telefone text DEFAULT NULL,
  _endereco text DEFAULT NULL,
  _trial_dias integer DEFAULT 14,
  _revenda_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _new_unidade_id UUID;
  _final_slug TEXT;
BEGIN
  IF NOT public.is_super_admin(_user_id) THEN
    RAISE EXCEPTION 'Apenas super admins podem criar unidades';
  END IF;

  _final_slug := COALESCE(
    NULLIF(trim(_slug), ''),
    lower(regexp_replace(unaccent_simple(_nome), '[^a-zA-Z0-9]+', '-', 'g'))
  );
  IF EXISTS (SELECT 1 FROM public.unidades WHERE slug = _final_slug) THEN
    _final_slug := _final_slug || '-' || substr(gen_random_uuid()::text, 1, 6);
  END IF;

  INSERT INTO public.unidades (
    nome, slug, cnpj, endereco, telefone, 
    trial_ends_at, status_assinatura, ativo,
    revenda_id
  )
  VALUES (
    trim(_nome), _final_slug, _cnpj, _endereco, _telefone,
    now() + (_trial_dias || ' days')::interval,
    'trial'::assinatura_status, true,
    _revenda_id
  )
  RETURNING id INTO _new_unidade_id;

  RETURN _new_unidade_id;
END;
$$;