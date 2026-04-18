
DO $$
DECLARE
  _user_id uuid := gen_random_uuid();
  _unidade_id uuid := 'e444402d-5ac5-4822-be57-9cec71741aa6'; -- Canoas
  _email text := 'medico.teste@filamed.dev';
  _existing uuid;
BEGIN
  -- Se já existe, reaproveita
  SELECT id INTO _existing FROM auth.users WHERE email = _email;
  IF _existing IS NOT NULL THEN
    _user_id := _existing;
    -- Atualiza senha
    UPDATE auth.users
    SET encrypted_password = crypt('Teste1234!', gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now()
    WHERE id = _user_id;
  ELSE
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      _user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      _email,
      crypt('Teste1234!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('nome_completo', 'Dr. Teste (Médico)'),
      now(), now(),
      '', '', '', ''
    );

    -- Cria identidade email (necessário para login)
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      _user_id,
      jsonb_build_object('sub', _user_id::text, 'email', _email, 'email_verified', true),
      'email',
      _user_id::text,
      now(), now(), now()
    );
  END IF;

  -- Garante profile vinculado à unidade
  INSERT INTO public.profiles (id, nome_completo, unidade_id)
  VALUES (_user_id, 'Dr. Teste (Médico)', _unidade_id)
  ON CONFLICT (id) DO UPDATE
    SET unidade_id = EXCLUDED.unidade_id,
        nome_completo = EXCLUDED.nome_completo;

  -- Garante role medico na unidade
  INSERT INTO public.user_roles (user_id, unidade_id, role)
  VALUES (_user_id, _unidade_id, 'medico')
  ON CONFLICT DO NOTHING;
END $$;
