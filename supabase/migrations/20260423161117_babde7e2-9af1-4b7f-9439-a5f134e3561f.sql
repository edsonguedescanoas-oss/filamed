-- Diagnóstico detalhado por canal para o admin SaaS
CREATE OR REPLACE FUNCTION public.admin_unidade_canais_diagnostico(_unidade_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result jsonb;
  _tv jsonb;
  _voz jsonb;
  _msg jsonb;
  _agora timestamptz := now();
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas super admin';
  END IF;

  -- ===== TV =====
  SELECT jsonb_build_object(
    'configurado', EXISTS (SELECT 1 FROM tv_visual_config WHERE unidade_id = _unidade_id),
    'logo_url', (SELECT logo_url FROM tv_visual_config WHERE unidade_id = _unidade_id),
    'resolucao', (SELECT resolucao_preset FROM tv_visual_config WHERE unidade_id = _unidade_id),
    'aspect_ratio', (SELECT aspect_ratio FROM tv_visual_config WHERE unidade_id = _unidade_id),
    'ultima_atualizacao', (SELECT updated_at FROM tv_visual_config WHERE unidade_id = _unidade_id),
    'midias_ativas', (SELECT COUNT(*) FROM sinalizacao_digital WHERE unidade_id = _unidade_id AND ativo = true),
    'ultima_chamada', (SELECT MAX(created_at) FROM chamadas WHERE unidade_id = _unidade_id),
    'chamadas_24h', (SELECT COUNT(*) FROM chamadas WHERE unidade_id = _unidade_id AND created_at >= _agora - interval '24 hours')
  ) INTO _tv;

  -- ===== VOZ =====
  SELECT jsonb_build_object(
    'configurado', EXISTS (SELECT 1 FROM unidade_voice_config WHERE unidade_id = _unidade_id AND provider <> 'browser'),
    'provider', COALESCE((SELECT provider FROM unidade_voice_config WHERE unidade_id = _unidade_id), 'browser'),
    'voice_id', (SELECT voice_id FROM unidade_voice_config WHERE unidade_id = _unidade_id),
    'ultima_atualizacao', (SELECT updated_at FROM unidade_voice_config WHERE unidade_id = _unidade_id),
    'cache_limpezas_7d', (SELECT COUNT(*) FROM tts_cache_cleanup_log WHERE executed_at >= _agora - interval '7 days'),
    'cache_erros_7d', (SELECT COUNT(*) FROM tts_cache_cleanup_log WHERE executed_at >= _agora - interval '7 days' AND error IS NOT NULL),
    'ultimo_erro_cache', (SELECT error FROM tts_cache_cleanup_log WHERE error IS NOT NULL ORDER BY executed_at DESC LIMIT 1)
  ) INTO _voz;

  -- ===== MENSAGERIA (WhatsApp/SMS/Telegram/Email/Push) =====
  WITH stats_canal AS (
    SELECT
      canal::text AS canal,
      COUNT(*) FILTER (WHERE created_at >= _agora - interval '24 hours') AS total_24h,
      COUNT(*) FILTER (WHERE created_at >= _agora - interval '24 hours' AND status = 'enviada') AS enviadas_24h,
      COUNT(*) FILTER (WHERE created_at >= _agora - interval '24 hours' AND status = 'falhou') AS falhas_24h,
      COUNT(*) FILTER (WHERE created_at >= _agora - interval '7 days' AND status = 'falhou') AS falhas_7d,
      MAX(created_at) FILTER (WHERE status = 'enviada') AS ultima_enviada,
      MAX(created_at) FILTER (WHERE status = 'falhou') AS ultima_falha,
      AVG(EXTRACT(EPOCH FROM (enviada_em - created_at)) * 1000)
        FILTER (WHERE created_at >= _agora - interval '24 hours' AND enviada_em IS NOT NULL) AS latencia_media_ms
    FROM notificacoes_log
    WHERE unidade_id = _unidade_id
    GROUP BY canal
  ),
  erros_recentes AS (
    SELECT canal::text AS canal,
      jsonb_agg(jsonb_build_object(
        'created_at', created_at,
        'destinatario', destinatario,
        'erro', erro,
        'tentativas', tentativas
      ) ORDER BY created_at DESC) FILTER (WHERE rn <= 3) AS exemplos
    FROM (
      SELECT canal, created_at, destinatario, erro, tentativas,
             ROW_NUMBER() OVER (PARTITION BY canal ORDER BY created_at DESC) AS rn
      FROM notificacoes_log
      WHERE unidade_id = _unidade_id
        AND status = 'falhou'
        AND created_at >= _agora - interval '7 days'
    ) t
    GROUP BY canal
  )
  SELECT jsonb_build_object(
    'whatsapp_configurado', (SELECT (whatsapp_config->>'ativo')::boolean FROM unidades WHERE id = _unidade_id),
    'canais', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'canal', s.canal,
        'total_24h', s.total_24h,
        'enviadas_24h', s.enviadas_24h,
        'falhas_24h', s.falhas_24h,
        'falhas_7d', s.falhas_7d,
        'taxa_sucesso_24h', CASE WHEN s.total_24h > 0
          THEN ROUND((s.enviadas_24h::numeric / s.total_24h::numeric) * 100, 1)
          ELSE NULL END,
        'latencia_media_ms', ROUND(s.latencia_media_ms),
        'ultima_enviada', s.ultima_enviada,
        'ultima_falha', s.ultima_falha,
        'erros_recentes', COALESCE(e.exemplos, '[]'::jsonb)
      ))
      FROM stats_canal s
      LEFT JOIN erros_recentes e ON e.canal = s.canal),
      '[]'::jsonb
    )
  ) INTO _msg;

  _result := jsonb_build_object(
    'tv', _tv,
    'voz', _voz,
    'mensageria', _msg,
    'gerado_em', _agora
  );

  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_unidade_canais_diagnostico(uuid) TO authenticated;