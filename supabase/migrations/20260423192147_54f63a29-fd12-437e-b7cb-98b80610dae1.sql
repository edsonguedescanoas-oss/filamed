-- RPC: histórico unificado por ponto de atendimento
-- Junta chamadas (destino = nome do ponto) com atendimentos finalizados
-- (profissional_id = quem estava no ponto). Filtros: ponto, busca por código
-- de senha, período. Retorna timeline ordenada por data desc.
CREATE OR REPLACE FUNCTION public.historico_ponto_atendimento(
  _unidade_id uuid,
  _ponto_id uuid DEFAULT NULL,
  _busca text DEFAULT NULL,
  _desde timestamptz DEFAULT NULL,
  _ate timestamptz DEFAULT NULL,
  _limite integer DEFAULT 200
)
RETURNS TABLE(
  evento_tipo text,           -- 'chamada' | 'finalizacao'
  evento_id uuid,
  ocorrido_em timestamptz,
  ponto_id uuid,
  ponto_nome text,
  senha_id uuid,
  senha_codigo text,
  fila_nome text,
  paciente_nome text,
  atendente_id uuid,
  atendente_nome text,
  duracao_segundos integer,
  observacoes text,
  requer_retorno boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ponto_nome text;
  v_busca text;
BEGIN
  -- Permissão: só quem pertence à unidade vê o histórico dela
  IF NOT belongs_to_unidade(auth.uid(), _unidade_id) THEN
    RAISE EXCEPTION 'Sem permissão para esta unidade';
  END IF;

  -- Resolve nome do ponto (necessário pra filtrar chamadas pelo destino)
  IF _ponto_id IS NOT NULL THEN
    SELECT nome INTO v_ponto_nome
    FROM pontos_atendimento
    WHERE id = _ponto_id AND unidade_id = _unidade_id;
    IF v_ponto_nome IS NULL THEN
      RAISE EXCEPTION 'Ponto não encontrado';
    END IF;
  END IF;

  v_busca := NULLIF(trim(coalesce(_busca, '')), '');

  RETURN QUERY
  WITH ev_chamada AS (
    SELECT
      'chamada'::text             AS evento_tipo,
      c.id                        AS evento_id,
      c.created_at                AS ocorrido_em,
      pa.id                       AS ponto_id,
      c.destino                   AS ponto_nome,
      s.id                        AS senha_id,
      s.codigo                    AS senha_codigo,
      f.nome                      AS fila_nome,
      pac.nome_completo           AS paciente_nome,
      c.chamado_por               AS atendente_id,
      pr.nome_completo            AS atendente_nome,
      NULL::int                   AS duracao_segundos,
      c.observacao                AS observacoes,
      NULL::boolean               AS requer_retorno
    FROM chamadas c
    JOIN senhas s        ON s.id = c.senha_id
    JOIN filas f         ON f.id = s.fila_id
    LEFT JOIN pacientes pac ON pac.id = s.paciente_id
    LEFT JOIN profiles pr   ON pr.id = c.chamado_por
    -- match por nome (chamadas guardam o destino como texto livre)
    LEFT JOIN pontos_atendimento pa
           ON pa.unidade_id = c.unidade_id
          AND pa.nome = c.destino
    WHERE c.unidade_id = _unidade_id
      AND (_ponto_id IS NULL OR c.destino = v_ponto_nome)
      AND (_desde IS NULL OR c.created_at >= _desde)
      AND (_ate   IS NULL OR c.created_at <= _ate)
      AND (v_busca IS NULL OR s.codigo ILIKE '%' || v_busca || '%')
  ),
  ev_finalizacao AS (
    SELECT
      'finalizacao'::text         AS evento_tipo,
      a.id                        AS evento_id,
      a.finalizado_em             AS ocorrido_em,
      pa.id                       AS ponto_id,
      pa.nome                     AS ponto_nome,
      s.id                        AS senha_id,
      s.codigo                    AS senha_codigo,
      f.nome                      AS fila_nome,
      pac.nome_completo           AS paciente_nome,
      a.profissional_id           AS atendente_id,
      pr.nome_completo            AS atendente_nome,
      a.duracao_segundos,
      a.observacoes,
      a.requer_retorno
    FROM atendimentos a
    JOIN senhas s         ON s.id = a.senha_id
    JOIN filas f          ON f.id = s.fila_id
    LEFT JOIN pacientes pac ON pac.id = a.paciente_id
    LEFT JOIN profiles pr   ON pr.id = a.profissional_id
    -- ponto do profissional no momento (snapshot atual; ok pra histórico operacional)
    LEFT JOIN pontos_atendimento pa
           ON pa.id = pr.ponto_atendimento_id
          AND pa.unidade_id = a.unidade_id
    WHERE a.unidade_id = _unidade_id
      AND a.finalizado_em IS NOT NULL
      AND (_ponto_id IS NULL OR pr.ponto_atendimento_id = _ponto_id)
      AND (_desde IS NULL OR a.finalizado_em >= _desde)
      AND (_ate   IS NULL OR a.finalizado_em <= _ate)
      AND (v_busca IS NULL OR s.codigo ILIKE '%' || v_busca || '%')
  )
  SELECT * FROM ev_chamada
  UNION ALL
  SELECT * FROM ev_finalizacao
  ORDER BY ocorrido_em DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(_limite, 1000));
END;
$$;

-- Índices para performance dos filtros
CREATE INDEX IF NOT EXISTS idx_chamadas_unidade_destino_created
  ON public.chamadas (unidade_id, destino, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_atendimentos_unidade_finalizado
  ON public.atendimentos (unidade_id, finalizado_em DESC)
  WHERE finalizado_em IS NOT NULL;