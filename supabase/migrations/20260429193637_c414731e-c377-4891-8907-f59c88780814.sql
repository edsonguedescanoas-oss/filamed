-- Ensure permissions exist or at least the logic is sound
-- If there's a permissions table, we should add it there. 
-- Based on the read_query, it seems roles are mapped to permissions in role_permissions.

INSERT INTO public.role_permissions (role, permission)
VALUES 
('super_admin', 'manage_automations'),
('admin', 'manage_automations')
ON CONFLICT DO NOTHING;
