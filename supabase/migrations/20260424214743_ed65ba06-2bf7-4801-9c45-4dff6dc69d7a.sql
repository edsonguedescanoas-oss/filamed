DROP FUNCTION IF EXISTS public.get_senha_por_token(uuid);

CREATE FUNCTION public.get_senha_por_token(_token uuid)
RETURNS TABLE(
  id uuid,
  codigo text,
  status senha_status,
  prioridade senha_prioridade,
  fila_id uuid,
  unidade_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  posicao integer,
  tempo_espera_estimado integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT s.id, s.codigo, s.status, s.prioridade, s.fila_id, s.unidade_id,
         s.created_at, s.updated_at, s.posicao, s.tempo_espera_estimado
  FROM public.senhas s
  WHERE s.token_publico = _token
  LIMIT 1;
$function$;