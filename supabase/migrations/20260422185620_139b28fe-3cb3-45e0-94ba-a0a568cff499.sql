CREATE OR REPLACE FUNCTION public.get_chamadas_recentes_detalhadas(_unidade_id uuid)
 RETURNS TABLE(id uuid, senha_id uuid, unidade_id uuid, destino text, created_at timestamp with time zone, senha_codigo text, fila_nome text, paciente_nome text)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT 
    c.id, 
    c.senha_id, 
    c.unidade_id, 
    c.destino, 
    c.created_at,
    s.codigo as senha_codigo,
    f.nome as fila_nome,
    p.nome_completo as paciente_nome
  FROM public.chamadas c
  JOIN public.senhas s ON c.senha_id = s.id
  JOIN public.filas f ON s.fila_id = f.id
  LEFT JOIN public.pacientes p ON s.paciente_id = p.id
  WHERE c.unidade_id = _unidade_id
    AND c.created_at > now() - interval '24 hours'
  ORDER BY c.created_at DESC
  LIMIT 30;
$function$;