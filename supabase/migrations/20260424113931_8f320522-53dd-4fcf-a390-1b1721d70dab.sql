-- Create invitations table
CREATE TABLE public.invitations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT email_unidade_unique UNIQUE (email, unidade_id)
);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can view invitations of their unit"
ON public.invitations
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND (
            (unidade_id = invitations.unidade_id AND role = 'admin')
            OR role = 'super_admin'
        )
    )
);

CREATE POLICY "Admins can insert invitations for their unit"
ON public.invitations
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND (
            (unidade_id = invitations.unidade_id AND role = 'admin')
            OR role = 'super_admin'
        )
    )
);

CREATE POLICY "Admins can delete invitations of their unit"
ON public.invitations
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND (
            (unidade_id = invitations.unidade_id AND role = 'admin')
            OR role = 'super_admin'
        )
    )
);

-- Public access to check a token (limited info)
CREATE OR REPLACE FUNCTION public.check_invitation_token(_token TEXT)
RETURNS TABLE (
    id UUID,
    email TEXT,
    unidade_nome TEXT,
    role TEXT,
    is_valid BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.email,
        u.nome as unidade_nome,
        i.role,
        (i.accepted_at IS NULL AND i.expires_at > now()) as is_valid
    FROM public.invitations i
    JOIN public.unidades u ON u.id = i.unidade_id
    WHERE i.token = _token;
END;
$$;
