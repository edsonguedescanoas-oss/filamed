
DO $$
DECLARE
  _unidade_id uuid := 'e444402d-5ac5-4822-be57-9cec71741aa6'; -- Canoas
  _password text := 'Teste1234!';
  _user_id uuid;
  _existing uuid;
  _rec record;
  _users text[][] := ARRAY[
    ['admin.teste@filamed.dev',      'Admin Teste',      'admin'],
    ['recepcao.teste@filamed.dev',   'Recepção Teste',   'recepcao'],
    ['medico.teste@filamed.dev',     'Dr. Médico Teste', 'medico'],
    ['enfermeiro.teste@filamed.dev', 'Enfermeiro Teste', 'enfermeiro'],
    ['gestor.teste@filamed.dev',     'Gestor Teste',     'gestor']
  ];
  i int;
  _email text;
  _nome text;
  _role app_role;
BEGIN
  FOR i IN 1 .. array_length(_users, 1) LOOP
    _email := _users[i][1];
    _nome  := _users[i][2];
    _role  := _users[i][3]::app_role;

    SELECT id INTO _existing FROM auth.users WHERE email = _email;

    IF _existing IS NOT NULL THEN
      _user_id := _existing;
      UPDATE auth.users
      SET encrypted_password = crypt(_password, gen_salt('bf')),
          email_confirmed_at = COALESCE(email_confirmed_at, now()),
          raw_user_meta_data = jsonb_build_object('nome_completo', _nome),
          updated_at = now()
      WHERE id = _user_id;
    ELSE
      _user_id := gen_random_uuid();
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, recovery_token,
        email_change_token_new, email_change
      ) VALUES (
        _user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated',
        _email, crypt(_password, gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('nome_completo', _nome),
        now(), now(), '', '', '', ''
      );

      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), _user_id,
        jsonb_build_object('sub', _user_id::text, 'email', _email, 'email_verified', true),
        'email', _user_id::text, now(), now(), now()
      );
    END IF;

    -- Profile vinculado a Canoas
    INSERT INTO public.profiles (id, nome_completo, unidade_id)
    VALUES (_user_id, _nome, _unidade_id)
    ON CONFLICT (id) DO UPDATE
      SET unidade_id = EXCLUDED.unidade_id,
          nome_completo = EXCLUDED.nome_completo;

    -- Role na unidade
    INSERT INTO public.user_roles (user_id, unidade_id, role)
    VALUES (_user_id, _unidade_id, _role)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
