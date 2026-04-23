CREATE OR REPLACE FUNCTION public.get_unidade_publica_detalhe(_unidade_id uuid)
RETURNS TABLE(id uuid, nome text, slug text, google_review_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT u.id, u.nome, u.slug, u.google_review_url
  FROM public.unidades u
  WHERE u.id = _unidade_id
    AND u.ativo = true
  LIMIT 1;
$function$;