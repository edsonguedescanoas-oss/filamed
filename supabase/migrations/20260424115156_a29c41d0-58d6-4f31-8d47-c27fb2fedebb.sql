DROP FUNCTION IF EXISTS public.check_invitation_token(text);

CREATE OR REPLACE FUNCTION public.check_invitation_token(_token text)
 RETURNS TABLE(id uuid, email text, unidade_nome text, role text, is_valid boolean, expires_at timestamptz)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.email,
        u.nome as unidade_nome,
        i.role,
        (i.accepted_at IS NULL AND i.expires_at > now()) as is_valid,
        i.expires_at
    FROM public.invitations i
    JOIN public.unidades u ON u.id = i.unidade_id
    WHERE i.token = _token;
END;
$function$;