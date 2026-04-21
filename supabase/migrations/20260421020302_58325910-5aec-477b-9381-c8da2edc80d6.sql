DROP FUNCTION IF EXISTS public.get_senhas_ativas(uuid);

CREATE OR REPLACE FUNCTION public.get_senhas_ativas(_unidade_id uuid)
 RETURNS TABLE(id uuid, codigo text, fila_id uuid, unidade_id uuid, paciente_id uuid, status senha_status, prioridade senha_prioridade, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.id, s.codigo, s.fila_id, s.unidade_id, s.paciente_id, s.status, s.prioridade,
         s.created_at, s.updated_at
  FROM public.senhas s
  WHERE s.unidade_id = _unidade_id
    AND s.status IN ('aguardando','chamada','em_atendimento')
  ORDER BY s.created_at;
$function$;

GRANT EXECUTE ON FUNCTION public.get_senhas_ativas(uuid) TO anon, authenticated;