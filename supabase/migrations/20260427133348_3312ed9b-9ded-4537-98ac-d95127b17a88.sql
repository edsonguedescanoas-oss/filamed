-- Adicionar colunas de A/B testing em notificacoes_log
ALTER TABLE public.notificacoes_log
  ADD COLUMN IF NOT EXISTS variant_key text,
  ADD COLUMN IF NOT EXISTS clicked_at timestamptz,
  ADD COLUMN IF NOT EXISTS tipo text;

CREATE INDEX IF NOT EXISTS idx_notificacoes_log_variant ON public.notificacoes_log (unidade_id, tipo, variant_key) WHERE variant_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notificacoes_log_clicked ON public.notificacoes_log (clicked_at) WHERE clicked_at IS NOT NULL;

-- Função para registrar clique via token de senha (rota /s/{token})
CREATE OR REPLACE FUNCTION public.registrar_clique_notificacao_por_token(_token uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _senha_id uuid;
BEGIN
  SELECT id INTO _senha_id FROM public.senhas WHERE token_publico = _token LIMIT 1;
  IF _senha_id IS NULL THEN
    RETURN;
  END IF;
  -- Marca o log mais recente desta senha (qualquer tipo) como clicado, se ainda não tiver
  UPDATE public.notificacoes_log
     SET clicked_at = now()
   WHERE id = (
     SELECT id FROM public.notificacoes_log
      WHERE senha_id = _senha_id
        AND clicked_at IS NULL
        AND status = 'enviada'
      ORDER BY created_at DESC
      LIMIT 1
   );
END;
$$;

-- Função para registrar clique no link de avaliação (rota /r/{unidade_id})
CREATE OR REPLACE FUNCTION public.registrar_clique_avaliacao(_unidade_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Marca o log de finalização mais recente desta unidade como clicado
  UPDATE public.notificacoes_log
     SET clicked_at = now()
   WHERE id = (
     SELECT id FROM public.notificacoes_log
      WHERE unidade_id = _unidade_id
        AND tipo = 'finalizacao'
        AND clicked_at IS NULL
        AND status = 'enviada'
        AND created_at > now() - interval '24 hours'
      ORDER BY created_at DESC
      LIMIT 1
   );
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_clique_notificacao_por_token(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_clique_avaliacao(uuid) TO anon, authenticated;

-- View de estatísticas por variante
CREATE OR REPLACE VIEW public.notificacoes_variantes_stats AS
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