DROP VIEW IF EXISTS public.notificacoes_variantes_stats;

CREATE VIEW public.notificacoes_variantes_stats
WITH (security_invoker = true)
AS
SELECT
  unidade_id,
  tipo,
  COALESCE(variant_key, 'default') AS variant_key,
  COUNT(*) FILTER (WHERE status = 'enviada') AS enviadas,
  COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) AS cliques,
  CASE
    WHEN COUNT(*) FILTER (WHERE status = 'enviada') > 0
    THEN ROUND(
      (COUNT(*) FILTER (WHERE clicked_at IS NOT NULL))::numeric * 100.0
      / COUNT(*) FILTER (WHERE status = 'enviada'),
      2
    )
    ELSE 0
  END AS ctr_percent,
  MAX(created_at) AS ultimo_envio
FROM public.notificacoes_log
WHERE tipo IS NOT NULL
GROUP BY unidade_id, tipo, COALESCE(variant_key, 'default');

GRANT SELECT ON public.notificacoes_variantes_stats TO authenticated;