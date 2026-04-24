DROP FUNCTION IF EXISTS public.check_invitation_token(text);

CREATE OR REPLACE FUNCTION public.check_invitation_token(_token text)
 RETURNS TABLE(
    id uuid, 
    email text, 
    unidade_nome text, 
    unidade_endereco text,
    role text, 
    role_permissions text,
    is_valid boolean, 
    expires_at timestamptz
 )
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
        u.endereco as unidade_endereco,
        i.role,
        CASE 
            WHEN i.role = 'admin' THEN 'Acesso total a configurações, faturamento, usuários e relatórios.'
            WHEN i.role = 'gestor' THEN 'Gerenciamento de filas, profissionais, escalas e visualização de métricas.'
            WHEN i.role = 'recepcao' THEN 'Emissão de senhas, triagem inicial e encaminhamento de pacientes.'
            WHEN i.role = 'medico' THEN 'Chamada de pacientes, registro de atendimentos e histórico clínico.'
            WHEN i.role = 'enfermeiro' THEN 'Triagem técnica, sinais vitais e apoio ao atendimento médico.'
            ELSE 'Acesso básico às funcionalidades da unidade.'
        END as role_permissions,
        (i.accepted_at IS NULL AND i.expires_at > now()) as is_valid,
        i.expires_at
    FROM public.invitations i
    JOIN public.unidades u ON u.id = i.unidade_id
    WHERE i.token = _token;
END;
$function$;