-- Update gerar_senha_guiche to include search_path for security
ALTER FUNCTION public.gerar_senha_guiche(uuid, text, text, date, public.senha_prioridade, jsonb) SET search_path TO 'public';