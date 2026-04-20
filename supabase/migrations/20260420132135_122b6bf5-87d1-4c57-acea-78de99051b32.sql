DROP FUNCTION IF EXISTS public.get_plano_atual(uuid);

CREATE OR REPLACE FUNCTION public.get_plano_atual(_unidade_id uuid)
RETURNS TABLE(
  assinatura_id uuid,
  plano_id uuid,
  plano_slug text,
  plano_nome text,
  status assinatura_estado,
  ciclo assinatura_ciclo,
  proximo_ciclo_em timestamp with time zone,
  recursos jsonb,
  limite_filas integer,
  limite_atendentes integer,
  limite_tvs integer,
  limite_senhas_mes integer,
  metadata jsonb,
  cancelar_no_fim_do_ciclo boolean,
  gateway_price_id_anual_oneoff text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    a.id, p.id, p.slug, p.nome, a.status, a.ciclo, a.proximo_ciclo_em,
    p.recursos, p.limite_filas, p.limite_atendentes, p.limite_tvs, p.limite_senhas_mes,
    a.metadata, a.cancelar_no_fim_do_ciclo, p.gateway_price_id_anual_oneoff
  FROM public.assinaturas a
  JOIN public.planos p ON p.id = a.plano_id
  WHERE a.unidade_id = _unidade_id
  LIMIT 1;
$function$;