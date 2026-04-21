-- Permite que o painel TV (anon) leia o nome do paciente para anunciar a chamada por voz.
-- Cria uma RPC pública que retorna apenas o primeiro/último nome dos pacientes
-- vinculados a senhas ativas (aguardando/chamada/em_atendimento) de uma unidade.
-- NÃO expõe CPF, telefone, email, prontuário, observações, data de nascimento.

CREATE OR REPLACE FUNCTION public.get_pacientes_publicos_ativos(_unidade_id uuid)
RETURNS TABLE(paciente_id uuid, nome_completo text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT DISTINCT p.id AS paciente_id, p.nome_completo
  FROM public.pacientes p
  JOIN public.senhas s ON s.paciente_id = p.id
  WHERE p.unidade_id = _unidade_id
    AND s.unidade_id = _unidade_id
    AND s.status IN ('aguardando','chamada','em_atendimento');
$function$;

-- Permite execução pública (TV anônimo)
GRANT EXECUTE ON FUNCTION public.get_pacientes_publicos_ativos(uuid) TO anon, authenticated;