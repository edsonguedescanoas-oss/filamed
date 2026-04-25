-- Corrigir função handle_updated_at
ALTER FUNCTION public.handle_updated_at() SET search_path = public;

-- Corrigir função get_user_revenda_id
ALTER FUNCTION public.get_user_revenda_id(p_uid UUID) SET search_path = public;