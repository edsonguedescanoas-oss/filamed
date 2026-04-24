CREATE OR REPLACE FUNCTION public.accept_invitation(_token text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_invitation_id uuid;
    v_unidade_id uuid;
    v_role text;
    v_email text;
    v_user_id uuid;
BEGIN
    -- 1. Get current user ID
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Você precisa estar logado para aceitar um convite.';
    END IF;

    -- 2. Verify invitation
    SELECT id, unidade_id, role, email
    INTO v_invitation_id, v_unidade_id, v_role, v_email
    FROM public.invitations
    WHERE token = _token
      AND accepted_at IS NULL
      AND expires_at > now();

    IF v_invitation_id IS NULL THEN
        RAISE EXCEPTION 'Convite inválido ou expirado.';
    END IF;

    -- 3. Link user to unit (Profile)
    UPDATE public.profiles
    SET unidade_id = v_unidade_id,
        ativo = true
    WHERE id = v_user_id;

    -- 4. Assign role
    -- Delete any existing role for this unit if needed, or just insert
    INSERT INTO public.user_roles (user_id, unidade_id, role)
    VALUES (v_user_id, v_unidade_id, v_role::app_role)
    ON CONFLICT (user_id, unidade_id) DO UPDATE SET role = EXCLUDED.role;

    -- 5. Mark invitation as accepted
    UPDATE public.invitations
    SET accepted_at = now()
    WHERE id = v_invitation_id;
END;
$function$;