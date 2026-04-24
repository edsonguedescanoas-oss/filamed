-- Create table for role-based permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role public.app_role NOT NULL,
    permission TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(role, permission)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Role permissions are viewable by everyone" 
ON public.role_permissions FOR SELECT 
TO authenticated 
USING (true);

-- Insert default permissions for each role
INSERT INTO public.role_permissions (role, permission) VALUES
-- Admin / Super Admin (all permissions)
('admin', 'call_passwords'),
('admin', 'manage_patients'),
('admin', 'manage_queues'),
('admin', 'generate_tickets'),
('admin', 'provide_care'),
('admin', 'manage_unit_settings'),
('admin', 'view_reports'),
('super_admin', 'call_passwords'),
('super_admin', 'manage_patients'),
('super_admin', 'manage_queues'),
('super_admin', 'generate_tickets'),
('super_admin', 'provide_care'),
('super_admin', 'manage_unit_settings'),
('super_admin', 'view_reports'),
('super_admin', 'manage_all_units'),

-- Recepção
('recepcao', 'call_passwords'),
('recepcao', 'manage_patients'),
('recepcao', 'generate_tickets'),
('recepcao', 'manage_queues'),

-- Médico
('medico', 'provide_care'),
('medico', 'view_reports'),
('medico', 'manage_patients'),

-- Enfermeiro
('enfermeiro', 'provide_care'),
('enfermeiro', 'manage_patients'),

-- Gestor
('gestor', 'view_reports'),
('gestor', 'manage_unit_settings')
ON CONFLICT DO NOTHING;
