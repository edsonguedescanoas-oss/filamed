CREATE OR REPLACE FUNCTION public.admin_metricas_unidade(
  _unidade_id uuid,
  _meses integer DEFAULT 6
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _hoje date := (now() at time zone 'utc')::date;
  _inicio_mes date := date_trunc('month', _hoje)::date;
  _inicio_mes_anterior date := (date_trunc('month', _hoje) - interval '1 month')::date;
  _fim_mes_anterior date := (_inicio_mes - interval '1 day')::date;
  _inicio_periodo date := (date_trunc('month', _hoje) - ((_meses - 1) || ' months')::interval)::date;
  _resultado jsonb;
  _unidade_nome text;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'acesso negado';
  END IF;

  SELECT nome INTO _unidade_nome FROM public.unidades WHERE id = _unidade_id;
  IF _unidade_nome IS NULL THEN
    RAISE EXCEPTION 'unidade não encontrada';
  END IF;

  WITH
  receita_mes AS (
    SELECT COALESCE(SUM(valor_centavos), 0)::bigint AS total
    FROM public.faturas
    WHERE unidade_id = _unidade_id
      AND status = 'paga'
      AND paga_em >= _inicio_mes
  ),
  receita_anterior AS (
    SELECT COALESCE(SUM(valor_centavos), 0)::bigint AS total
    FROM public.faturas
    WHERE unidade_id = _unidade_id
      AND status = 'paga'
      AND paga_em >= _inicio_mes_anterior
      AND paga_em <= _fim_mes_anterior
  ),
  mrr AS (
    SELECT COALESCE(SUM(
      CASE
        WHEN a.ciclo = 'mensal' THEN p.preco_mensal_centavos
        WHEN a.ciclo = 'anual'  THEN COALESCE(p.preco_anual_centavos, 0) / 12
        ELSE 0
      END
    ), 0)::bigint AS valor
    FROM public.assinaturas a
    JOIN public.planos p ON p.id = a.plano_id
    WHERE a.unidade_id = _unidade_id
      AND a.status IN ('ativa', 'trialing')
  ),
  churn AS (
    SELECT
      COUNT(*) FILTER (WHERE cancelada_em >= _inicio_mes)::int AS canceladas_mes,
      COUNT(*) FILTER (
        WHERE inicio_em < _inicio_mes
          AND (cancelada_em IS NULL OR cancelada_em >= _inicio_mes)
      )::int AS base_inicio_mes
    FROM public.assinaturas
    WHERE unidade_id = _unidade_id
  ),
  totais_periodo AS (
    SELECT
      (SELECT COUNT(*) FROM public.senhas
        WHERE unidade_id = _unidade_id AND created_at >= _inicio_periodo)::int AS total_senhas,
      (SELECT COUNT(*) FROM public.notificacoes_log
        WHERE unidade_id = _unidade_id AND created_at >= _inicio_periodo)::int AS total_notificacoes,
      (SELECT COUNT(*) FROM public.notificacoes_log
        WHERE unidade_id = _unidade_id AND created_at >= _inicio_periodo
          AND status = 'falhou')::int AS total_notificacoes_falhas
  ),
  meses AS (
    SELECT generate_series(
      _inicio_periodo,
      _inicio_mes,
      '1 month'::interval
    )::date AS mes
  ),
  serie AS (
    SELECT
      to_char(m.mes, 'YYYY-MM') AS mes,
      to_char(m.mes, 'TMMon/YY') AS mes_label,
      (
        SELECT COALESCE(SUM(valor_centavos), 0)::bigint
        FROM public.faturas
        WHERE unidade_id = _unidade_id
          AND status = 'paga'
          AND paga_em >= m.mes
          AND paga_em < (m.mes + interval '1 month')::date
      ) AS receita,
      (
        SELECT COUNT(*)::int
        FROM public.senhas
        WHERE unidade_id = _unidade_id
          AND created_at >= m.mes
          AND created_at < (m.mes + interval '1 month')
      ) AS senhas,
      (
        SELECT COUNT(*)::int
        FROM public.notificacoes_log
        WHERE unidade_id = _unidade_id
          AND created_at >= m.mes
          AND created_at < (m.mes + interval '1 month')
      ) AS notificacoes,
      (
        SELECT COUNT(*)::int
        FROM public.assinaturas
        WHERE unidade_id = _unidade_id
          AND cancelada_em >= m.mes
          AND cancelada_em < (m.mes + interval '1 month')
      ) AS cancelamentos
    FROM meses m
    ORDER BY m.mes
  )
  SELECT jsonb_build_object(
    'unidade_id', _unidade_id,
    'unidade_nome', _unidade_nome,
    'gerado_em', now(),
    'kpis', jsonb_build_object(
      'receita_mes_atual', (SELECT total FROM receita_mes),
      'receita_mes_anterior', (SELECT total FROM receita_anterior),
      'mrr_estimado', (SELECT valor FROM mrr),
      'churn_canceladas_mes', (SELECT canceladas_mes FROM churn),
      'churn_base_inicio_mes', (SELECT base_inicio_mes FROM churn),
      'churn_taxa', CASE
        WHEN (SELECT base_inicio_mes FROM churn) > 0
        THEN ROUND(((SELECT canceladas_mes FROM churn)::numeric / (SELECT base_inicio_mes FROM churn)::numeric) * 100, 2)
        ELSE 0
      END,
      'total_senhas_periodo', (SELECT total_senhas FROM totais_periodo),
      'total_notificacoes_periodo', (SELECT total_notificacoes FROM totais_periodo),
      'total_notificacoes_falhas_periodo', (SELECT total_notificacoes_falhas FROM totais_periodo)
    ),
    'series', COALESCE((SELECT jsonb_agg(row_to_json(serie)) FROM serie), '[]'::jsonb)
  ) INTO _resultado;

  RETURN _resultado;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_metricas_unidade(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_metricas_unidade(uuid, integer) TO authenticated;