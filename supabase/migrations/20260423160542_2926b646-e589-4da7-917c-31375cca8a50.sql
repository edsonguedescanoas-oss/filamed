-- Métricas globais para painel super_admin do SaaS

CREATE OR REPLACE FUNCTION public.admin_metricas_globais(
  _meses integer DEFAULT 6
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _now timestamptz := now();
  _inicio_mes timestamptz := date_trunc('month', _now);
  _inicio_mes_ant timestamptz := date_trunc('month', _now - interval '1 month');
  _kpis jsonb;
  _series jsonb;
  _top_unidades jsonb;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas super admins podem acessar métricas globais';
  END IF;

  -- KPIs principais
  WITH receita_atual AS (
    SELECT COALESCE(SUM(valor_centavos), 0) AS total
    FROM public.faturas
    WHERE status = 'paga' AND paga_em >= _inicio_mes
  ),
  receita_anterior AS (
    SELECT COALESCE(SUM(valor_centavos), 0) AS total
    FROM public.faturas
    WHERE status = 'paga'
      AND paga_em >= _inicio_mes_ant
      AND paga_em < _inicio_mes
  ),
  mrr AS (
    -- Receita recorrente: soma do preço mensal dos planos com assinatura ativa/trialing
    SELECT COALESCE(SUM(
      CASE WHEN a.ciclo = 'anual' THEN COALESCE(p.preco_anual_centavos, p.preco_mensal_centavos * 10) / 12
           ELSE p.preco_mensal_centavos
      END
    ), 0) AS total
    FROM public.assinaturas a
    JOIN public.planos p ON p.id = a.plano_id
    WHERE a.status IN ('ativa', 'trialing')
  ),
  unidades_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE ativo = true) AS ativas,
      COUNT(*) FILTER (WHERE status_assinatura = 'trial') AS em_trial,
      COUNT(*) FILTER (WHERE status_assinatura = 'ativo') AS pagantes,
      COUNT(*) FILTER (WHERE status_assinatura = 'suspenso') AS suspensas,
      COUNT(*) FILTER (WHERE status_assinatura = 'cancelado') AS canceladas,
      COUNT(*) AS total
    FROM public.unidades
  ),
  novas_mes AS (
    SELECT COUNT(*) AS total
    FROM public.unidades
    WHERE created_at >= _inicio_mes
  ),
  -- Churn: assinaturas canceladas no mês / assinaturas ativas no início do mês
  churn_mes AS (
    SELECT
      COUNT(*) FILTER (WHERE cancelada_em >= _inicio_mes) AS canceladas_mes,
      COUNT(*) FILTER (WHERE inicio_em < _inicio_mes
                        AND (cancelada_em IS NULL OR cancelada_em >= _inicio_mes)) AS base_inicio_mes
    FROM public.assinaturas
  ),
  faturas_pendentes AS (
    SELECT
      COUNT(*) AS qtd,
      COALESCE(SUM(valor_centavos), 0) AS valor
    FROM public.faturas
    WHERE status IN ('aberta', 'falhou')
  )
  SELECT jsonb_build_object(
    'receita_mes_atual', (SELECT total FROM receita_atual),
    'receita_mes_anterior', (SELECT total FROM receita_anterior),
    'mrr_estimado', (SELECT total FROM mrr),
    'unidades_ativas', (SELECT ativas FROM unidades_stats),
    'unidades_em_trial', (SELECT em_trial FROM unidades_stats),
    'unidades_pagantes', (SELECT pagantes FROM unidades_stats),
    'unidades_suspensas', (SELECT suspensas FROM unidades_stats),
    'unidades_canceladas', (SELECT canceladas FROM unidades_stats),
    'unidades_total', (SELECT total FROM unidades_stats),
    'novas_unidades_mes', (SELECT total FROM novas_mes),
    'churn_canceladas_mes', (SELECT canceladas_mes FROM churn_mes),
    'churn_base_inicio_mes', (SELECT base_inicio_mes FROM churn_mes),
    'churn_taxa', CASE
      WHEN (SELECT base_inicio_mes FROM churn_mes) > 0
      THEN ROUND(((SELECT canceladas_mes FROM churn_mes)::numeric / (SELECT base_inicio_mes FROM churn_mes)::numeric) * 100, 2)
      ELSE 0
    END,
    'faturas_pendentes_qtd', (SELECT qtd FROM faturas_pendentes),
    'faturas_pendentes_valor', (SELECT valor FROM faturas_pendentes)
  ) INTO _kpis;

  -- Séries mensais (últimos N meses)
  WITH meses AS (
    SELECT generate_series(
      date_trunc('month', _now) - ((_meses - 1) || ' months')::interval,
      date_trunc('month', _now),
      '1 month'::interval
    ) AS mes
  ),
  receita_serie AS (
    SELECT date_trunc('month', paga_em) AS mes, SUM(valor_centavos) AS valor
    FROM public.faturas
    WHERE status = 'paga' AND paga_em IS NOT NULL
      AND paga_em >= date_trunc('month', _now) - ((_meses - 1) || ' months')::interval
    GROUP BY 1
  ),
  novas_serie AS (
    SELECT date_trunc('month', created_at) AS mes, COUNT(*) AS qtd
    FROM public.unidades
    WHERE created_at >= date_trunc('month', _now) - ((_meses - 1) || ' months')::interval
    GROUP BY 1
  ),
  cancel_serie AS (
    SELECT date_trunc('month', cancelada_em) AS mes, COUNT(*) AS qtd
    FROM public.assinaturas
    WHERE cancelada_em IS NOT NULL
      AND cancelada_em >= date_trunc('month', _now) - ((_meses - 1) || ' months')::interval
    GROUP BY 1
  ),
  senhas_serie AS (
    SELECT date_trunc('month', created_at) AS mes, COUNT(*) AS qtd
    FROM public.senhas
    WHERE created_at >= date_trunc('month', _now) - ((_meses - 1) || ' months')::interval
    GROUP BY 1
  ),
  notif_serie AS (
    SELECT date_trunc('month', created_at) AS mes, COUNT(*) AS qtd
    FROM public.notificacoes_log
    WHERE created_at >= date_trunc('month', _now) - ((_meses - 1) || ' months')::interval
    GROUP BY 1
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'mes', to_char(m.mes, 'YYYY-MM'),
      'mes_label', to_char(m.mes, 'Mon/YY'),
      'receita', COALESCE(rs.valor, 0),
      'novas_unidades', COALESCE(ns.qtd, 0),
      'cancelamentos', COALESCE(cs.qtd, 0),
      'senhas', COALESCE(ss.qtd, 0),
      'notificacoes', COALESCE(nt.qtd, 0)
    ) ORDER BY m.mes
  ) INTO _series
  FROM meses m
  LEFT JOIN receita_serie rs ON rs.mes = m.mes
  LEFT JOIN novas_serie ns ON ns.mes = m.mes
  LEFT JOIN cancel_serie cs ON cs.mes = m.mes
  LEFT JOIN senhas_serie ss ON ss.mes = m.mes
  LEFT JOIN notif_serie nt ON nt.mes = m.mes;

  -- Top 10 unidades por uso (senhas no mês corrente)
  WITH uso AS (
    SELECT
      u.id,
      u.nome,
      u.status_assinatura,
      COUNT(s.id) AS senhas_mes,
      (SELECT p.nome FROM public.assinaturas a
        JOIN public.planos p ON p.id = a.plano_id
        WHERE a.unidade_id = u.id LIMIT 1) AS plano_nome
    FROM public.unidades u
    LEFT JOIN public.senhas s ON s.unidade_id = u.id AND s.created_at >= _inicio_mes
    WHERE u.ativo = true
    GROUP BY u.id, u.nome, u.status_assinatura
    ORDER BY senhas_mes DESC
    LIMIT 10
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'unidade_id', id,
      'nome', nome,
      'status_assinatura', status_assinatura,
      'plano_nome', plano_nome,
      'senhas_mes', senhas_mes
    )
  ) INTO _top_unidades
  FROM uso;

  RETURN jsonb_build_object(
    'kpis', _kpis,
    'series', COALESCE(_series, '[]'::jsonb),
    'top_unidades', COALESCE(_top_unidades, '[]'::jsonb),
    'gerado_em', _now
  );
END;
$$;