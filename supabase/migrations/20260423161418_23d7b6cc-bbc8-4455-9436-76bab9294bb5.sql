-- Lista alertas de notificações com falhas repetidas para o admin SaaS
CREATE OR REPLACE FUNCTION public.admin_alertas_notificacoes(
  _janela_horas integer DEFAULT 24,
  _min_falhas integer DEFAULT 2
)
RETURNS TABLE (
  unidade_id uuid,
  unidade_nome text,
  canal text,
  destinatario text,
  total_falhas integer,
  total_tentativas integer,
  primeira_falha timestamptz,
  ultima_falha timestamptz,
  ultimo_erro text,
  severidade text,
  notificacao_ids uuid[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas super admin';
  END IF;

  RETURN QUERY
  WITH falhas AS (
    SELECT
      n.unidade_id,
      n.canal::text AS canal,
      n.destinatario,
      n.id,
      n.created_at,
      n.erro,
      n.tentativas
    FROM notificacoes_log n
    WHERE n.status = 'falhou'
      AND n.created_at >= now() - (_janela_horas || ' hours')::interval
  ),
  agrupado AS (
    SELECT
      f.unidade_id,
      f.canal,
      f.destinatario,
      COUNT(*)::integer AS total_falhas,
      COALESCE(SUM(f.tentativas), 0)::integer AS total_tentativas,
      MIN(f.created_at) AS primeira_falha,
      MAX(f.created_at) AS ultima_falha,
      (ARRAY_AGG(f.erro ORDER BY f.created_at DESC))[1] AS ultimo_erro,
      ARRAY_AGG(f.id ORDER BY f.created_at DESC) AS notificacao_ids
    FROM falhas f
    GROUP BY f.unidade_id, f.canal, f.destinatario
    HAVING COUNT(*) >= _min_falhas
  )
  SELECT
    a.unidade_id,
    u.nome AS unidade_nome,
    a.canal,
    a.destinatario,
    a.total_falhas,
    a.total_tentativas,
    a.primeira_falha,
    a.ultima_falha,
    a.ultimo_erro,
    CASE
      WHEN a.total_falhas >= 10 THEN 'critica'
      WHEN a.total_falhas >= 5 THEN 'alta'
      ELSE 'media'
    END AS severidade,
    a.notificacao_ids
  FROM agrupado a
  LEFT JOIN unidades u ON u.id = a.unidade_id
  ORDER BY a.total_falhas DESC, a.ultima_falha DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_alertas_notificacoes(integer, integer) TO authenticated;

-- Resumo: contagem total de alertas (para badge no menu)
CREATE OR REPLACE FUNCTION public.admin_alertas_resumo(_janela_horas integer DEFAULT 24, _min_falhas integer DEFAULT 2)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _r jsonb;
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas super admin';
  END IF;

  WITH falhas AS (
    SELECT n.unidade_id, n.canal::text AS canal, n.destinatario, n.created_at
    FROM notificacoes_log n
    WHERE n.status = 'falhou'
      AND n.created_at >= now() - (_janela_horas || ' hours')::interval
  ),
  grupos AS (
    SELECT unidade_id, canal, destinatario, COUNT(*) AS c
    FROM falhas
    GROUP BY unidade_id, canal, destinatario
    HAVING COUNT(*) >= _min_falhas
  )
  SELECT jsonb_build_object(
    'total_alertas', (SELECT COUNT(*) FROM grupos),
    'criticos', (SELECT COUNT(*) FROM grupos WHERE c >= 10),
    'altos', (SELECT COUNT(*) FROM grupos WHERE c >= 5 AND c < 10),
    'medios', (SELECT COUNT(*) FROM grupos WHERE c < 5),
    'unidades_afetadas', (SELECT COUNT(DISTINCT unidade_id) FROM grupos),
    'canais_afetados', (SELECT jsonb_object_agg(canal, qtd)
       FROM (SELECT canal, COUNT(*) AS qtd FROM grupos GROUP BY canal) x)
  ) INTO _r;

  RETURN _r;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_alertas_resumo(integer, integer) TO authenticated;