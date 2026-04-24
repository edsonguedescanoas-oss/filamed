-- Função: recalcula posicao e tempo_espera_estimado de todas as senhas
-- "aguardando" de uma fila específica, com base em prioridade + ordem de
-- chegada. Mantém o tempo médio configurado em filas.tempo_espera_estimado
-- como fonte da verdade.
CREATE OR REPLACE FUNCTION public.recalcular_posicoes_fila(p_fila_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tempo_medio integer;
BEGIN
  IF p_fila_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(tempo_espera_estimado, 10)
    INTO v_tempo_medio
    FROM public.filas
   WHERE id = p_fila_id;

  IF v_tempo_medio IS NULL THEN
    v_tempo_medio := 10;
  END IF;

  -- Senhas não-aguardando da fila: zera posicao e tempo_espera_estimado
  -- (não faz sentido manter posição em senha chamada/finalizada/etc.)
  UPDATE public.senhas
     SET posicao = NULL,
         tempo_espera_estimado = NULL,
         updated_at = now()
   WHERE fila_id = p_fila_id
     AND status <> 'aguardando'
     AND (posicao IS NOT NULL OR tempo_espera_estimado IS NOT NULL);

  -- Recalcula a ordem para as senhas aguardando.
  -- Prioridade: urgente (3) > preferencial (2) > normal (1).
  -- Empate: created_at mais antigo primeiro.
  WITH ordenadas AS (
    SELECT
      s.id,
      ROW_NUMBER() OVER (
        ORDER BY
          CASE s.prioridade
            WHEN 'urgente' THEN 3
            WHEN 'preferencial' THEN 2
            ELSE 1
          END DESC,
          s.created_at ASC
      ) AS nova_pos
    FROM public.senhas s
    WHERE s.fila_id = p_fila_id
      AND s.status = 'aguardando'
  )
  UPDATE public.senhas s
     SET posicao = o.nova_pos,
         tempo_espera_estimado = GREATEST(0, (o.nova_pos - 1)) * v_tempo_medio,
         updated_at = now()
    FROM ordenadas o
   WHERE s.id = o.id
     AND (
       s.posicao IS DISTINCT FROM o.nova_pos
       OR s.tempo_espera_estimado IS DISTINCT FROM (GREATEST(0, (o.nova_pos - 1)) * v_tempo_medio)
     );
END;
$$;

-- Trigger function: dispara o recálculo nas filas afetadas após qualquer
-- mudança em senhas. Usa AFTER + STATEMENT seria ideal, mas precisamos
-- saber quais filas mudaram, então usamos AFTER ROW e deixamos a função
-- ser idempotente (só atualiza se houver diferença real).
CREATE OR REPLACE FUNCTION public.trg_senhas_recalcular()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_fila uuid;
  v_new_fila uuid;
BEGIN
  -- Detecta qual operação para extrair fila_id corretamente
  IF TG_OP = 'INSERT' THEN
    v_new_fila := NEW.fila_id;
    PERFORM public.recalcular_posicoes_fila(v_new_fila);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_old_fila := OLD.fila_id;
    PERFORM public.recalcular_posicoes_fila(v_old_fila);
    RETURN OLD;
  ELSE -- UPDATE
    v_old_fila := OLD.fila_id;
    v_new_fila := NEW.fila_id;

    -- Evita loop infinito: se o próprio trigger atualizou apenas
    -- posicao/tempo_espera_estimado/updated_at, não dispara de novo.
    IF v_old_fila = v_new_fila
       AND OLD.status = NEW.status
       AND OLD.prioridade = NEW.prioridade
       AND OLD.created_at = NEW.created_at THEN
      RETURN NEW;
    END IF;

    PERFORM public.recalcular_posicoes_fila(v_new_fila);
    -- Se mudou de fila, recalcula também a fila de origem
    IF v_old_fila IS DISTINCT FROM v_new_fila THEN
      PERFORM public.recalcular_posicoes_fila(v_old_fila);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

-- Drop e recria trigger para garantir idempotência da migration
DROP TRIGGER IF EXISTS trg_senhas_recalcular_posicoes ON public.senhas;

CREATE TRIGGER trg_senhas_recalcular_posicoes
AFTER INSERT OR UPDATE OR DELETE ON public.senhas
FOR EACH ROW
EXECUTE FUNCTION public.trg_senhas_recalcular();

-- Backfill: recalcula para todas as filas existentes uma única vez,
-- garantindo consistência imediata após a migration.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.filas WHERE ativa = true LOOP
    PERFORM public.recalcular_posicoes_fila(r.id);
  END LOOP;
END$$;