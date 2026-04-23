
-- 1. ENUM ponto_tipo
DO $$ BEGIN
  CREATE TYPE public.ponto_tipo AS ENUM ('guiche', 'consultorio', 'exame', 'outro');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. pontos_atendimento
CREATE TABLE IF NOT EXISTS public.pontos_atendimento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id uuid NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo public.ponto_tipo NOT NULL DEFAULT 'guiche',
  fila_id uuid REFERENCES public.filas(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unidade_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_pontos_unidade ON public.pontos_atendimento(unidade_id);
CREATE INDEX IF NOT EXISTS idx_pontos_fila ON public.pontos_atendimento(fila_id);

ALTER TABLE public.pontos_atendimento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ler pontos da unidade" ON public.pontos_atendimento;
CREATE POLICY "ler pontos da unidade"
ON public.pontos_atendimento FOR SELECT TO authenticated
USING (belongs_to_unidade(auth.uid(), unidade_id));

DROP POLICY IF EXISTS "admin gerencia pontos" ON public.pontos_atendimento;
CREATE POLICY "admin gerencia pontos"
ON public.pontos_atendimento FOR ALL TO authenticated
USING (has_role_in_unidade(auth.uid(), unidade_id, 'admin'::app_role))
WITH CHECK (has_role_in_unidade(auth.uid(), unidade_id, 'admin'::app_role));

DROP POLICY IF EXISTS "super admin gerencia pontos" ON public.pontos_atendimento;
CREATE POLICY "super admin gerencia pontos"
ON public.pontos_atendimento FOR ALL TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_pontos_atendimento_updated_at ON public.pontos_atendimento;
CREATE TRIGGER trg_pontos_atendimento_updated_at
BEFORE UPDATE ON public.pontos_atendimento
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. profiles.ponto_atendimento_id
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ponto_atendimento_id uuid
    REFERENCES public.pontos_atendimento(id) ON DELETE SET NULL;

-- 4. senhas.senha_origem_id
ALTER TABLE public.senhas
  ADD COLUMN IF NOT EXISTS senha_origem_id uuid
    REFERENCES public.senhas(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_senhas_origem ON public.senhas(senha_origem_id);

-- 5. atendimentos
ALTER TABLE public.atendimentos
  ADD COLUMN IF NOT EXISTS requer_retorno boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS senha_retorno_id uuid
    REFERENCES public.senhas(id) ON DELETE SET NULL;

-- 6. guiche_atendimentos
CREATE TABLE IF NOT EXISTS public.guiche_atendimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id uuid NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  senha_id uuid NOT NULL REFERENCES public.senhas(id) ON DELETE CASCADE,
  ponto_atendimento_id uuid REFERENCES public.pontos_atendimento(id) ON DELETE SET NULL,
  fila_destino_id uuid REFERENCES public.filas(id) ON DELETE SET NULL,
  senha_destino_id uuid REFERENCES public.senhas(id) ON DELETE SET NULL,
  tipo text NOT NULL DEFAULT 'avulso',
  observacoes text,
  atendido_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guiche_at_unidade ON public.guiche_atendimentos(unidade_id);
CREATE INDEX IF NOT EXISTS idx_guiche_at_senha ON public.guiche_atendimentos(senha_id);

ALTER TABLE public.guiche_atendimentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ler guiche_atendimentos da unidade" ON public.guiche_atendimentos;
CREATE POLICY "ler guiche_atendimentos da unidade"
ON public.guiche_atendimentos FOR SELECT TO authenticated
USING (belongs_to_unidade(auth.uid(), unidade_id));

DROP POLICY IF EXISTS "equipe registra guiche_atendimentos" ON public.guiche_atendimentos;
CREATE POLICY "equipe registra guiche_atendimentos"
ON public.guiche_atendimentos FOR INSERT TO authenticated
WITH CHECK (
  belongs_to_unidade(auth.uid(), unidade_id)
  AND (atendido_por = auth.uid() OR atendido_por IS NULL)
);

-- 7. ensure_fila_guiche + seed + trigger
CREATE OR REPLACE FUNCTION public.ensure_fila_guiche(_unidade_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_fila_id uuid;
BEGIN
  SELECT id INTO v_fila_id FROM public.filas
   WHERE unidade_id = _unidade_id AND tipo = 'guiche'::public.fila_tipo LIMIT 1;
  IF v_fila_id IS NULL THEN
    INSERT INTO public.filas (unidade_id, nome, tipo, prefixo_senha, cor, ordem, ativa)
    VALUES (_unidade_id, 'Guichê', 'guiche'::public.fila_tipo, 'G', '#6366F1', 0, true)
    RETURNING id INTO v_fila_id;
  END IF;
  RETURN v_fila_id;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.unidades LOOP
    PERFORM public.ensure_fila_guiche(r.id);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.trg_unidade_after_insert_fila_guiche()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.ensure_fila_guiche(NEW.id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_unidades_fila_guiche ON public.unidades;
CREATE TRIGGER trg_unidades_fila_guiche
AFTER INSERT ON public.unidades
FOR EACH ROW EXECUTE FUNCTION public.trg_unidade_after_insert_fila_guiche();

-- 8. gerar_senha_guiche
CREATE OR REPLACE FUNCTION public.gerar_senha_guiche(
  _unidade_id uuid,
  _nome text,
  _telefone text DEFAULT NULL,
  _data_nascimento date DEFAULT NULL,
  _prioridade public.senha_prioridade DEFAULT 'normal'
) RETURNS public.senhas
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_paciente_id uuid;
  v_fila_id uuid;
  v_senha public.senhas;
BEGIN
  IF NOT belongs_to_unidade(auth.uid(), _unidade_id) THEN
    RAISE EXCEPTION 'Sem permissão para esta unidade';
  END IF;
  IF _nome IS NULL OR length(trim(_nome)) < 2 THEN
    RAISE EXCEPTION 'Nome obrigatório';
  END IF;

  IF _telefone IS NOT NULL AND length(trim(_telefone)) > 0 THEN
    SELECT id INTO v_paciente_id FROM public.pacientes
     WHERE unidade_id = _unidade_id AND telefone = _telefone LIMIT 1;
  END IF;

  IF v_paciente_id IS NULL THEN
    INSERT INTO public.pacientes (unidade_id, nome_completo, telefone, data_nascimento)
    VALUES (_unidade_id, trim(_nome), _telefone, _data_nascimento)
    RETURNING id INTO v_paciente_id;
  ELSE
    UPDATE public.pacientes
    SET nome_completo = trim(_nome),
        data_nascimento = COALESCE(_data_nascimento, data_nascimento),
        updated_at = now()
    WHERE id = v_paciente_id;
  END IF;

  v_fila_id := public.ensure_fila_guiche(_unidade_id);

  SELECT * INTO v_senha FROM public.gerar_senha(
    _fila_id => v_fila_id,
    _prioridade => _prioridade,
    _paciente_id => v_paciente_id,
    _origem => 'pre_atendimento'
  );
  RETURN v_senha;
END $$;

-- 9. chamar_senha_do_ponto
CREATE OR REPLACE FUNCTION public.chamar_senha_do_ponto(
  _senha_id uuid,
  _ponto_atendimento_id uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_unidade_id uuid;
  v_ponto_unidade uuid;
  v_destino text;
  v_chamada_id uuid;
BEGIN
  SELECT unidade_id INTO v_unidade_id FROM public.senhas WHERE id = _senha_id;
  IF v_unidade_id IS NULL THEN RAISE EXCEPTION 'Senha não encontrada'; END IF;

  SELECT unidade_id, nome INTO v_ponto_unidade, v_destino
  FROM public.pontos_atendimento WHERE id = _ponto_atendimento_id;

  IF v_ponto_unidade IS NULL THEN RAISE EXCEPTION 'Ponto não encontrado'; END IF;
  IF v_ponto_unidade <> v_unidade_id THEN RAISE EXCEPTION 'Ponto pertence a outra unidade'; END IF;
  IF NOT belongs_to_unidade(auth.uid(), v_unidade_id) THEN
    RAISE EXCEPTION 'Sem permissão para esta unidade';
  END IF;

  UPDATE public.senhas SET status = 'chamada', updated_at = now() WHERE id = _senha_id;

  INSERT INTO public.chamadas (unidade_id, senha_id, destino, chamado_por)
  VALUES (v_unidade_id, _senha_id, v_destino, auth.uid())
  RETURNING id INTO v_chamada_id;

  RETURN v_chamada_id;
END $$;

-- 10. encaminhar_do_guiche
CREATE OR REPLACE FUNCTION public.encaminhar_do_guiche(
  _senha_guiche_id uuid,
  _fila_destino_id uuid,
  _tipo text DEFAULT 'avulso',
  _observacoes text DEFAULT NULL,
  _prioridade public.senha_prioridade DEFAULT 'normal'
) RETURNS public.senhas
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_unidade_id uuid;
  v_paciente_id uuid;
  v_fila_unidade uuid;
  v_nova_senha public.senhas;
  v_ponto_id uuid;
BEGIN
  SELECT unidade_id, paciente_id INTO v_unidade_id, v_paciente_id
  FROM public.senhas WHERE id = _senha_guiche_id;
  IF v_unidade_id IS NULL THEN RAISE EXCEPTION 'Senha do guichê não encontrada'; END IF;

  SELECT unidade_id INTO v_fila_unidade FROM public.filas WHERE id = _fila_destino_id;
  IF v_fila_unidade IS NULL THEN RAISE EXCEPTION 'Fila destino não encontrada'; END IF;
  IF v_fila_unidade <> v_unidade_id THEN RAISE EXCEPTION 'Fila destino pertence a outra unidade'; END IF;
  IF NOT belongs_to_unidade(auth.uid(), v_unidade_id) THEN
    RAISE EXCEPTION 'Sem permissão para esta unidade';
  END IF;

  UPDATE public.senhas
  SET status = 'finalizada', finalizada_em = now(), updated_at = now()
  WHERE id = _senha_guiche_id;

  SELECT * INTO v_nova_senha FROM public.gerar_senha(
    _fila_id => _fila_destino_id,
    _prioridade => _prioridade,
    _paciente_id => v_paciente_id,
    _origem => 'guiche'
  );

  UPDATE public.senhas SET senha_origem_id = _senha_guiche_id WHERE id = v_nova_senha.id;

  SELECT ponto_atendimento_id INTO v_ponto_id FROM public.profiles WHERE id = auth.uid();

  INSERT INTO public.guiche_atendimentos (
    unidade_id, senha_id, ponto_atendimento_id,
    fila_destino_id, senha_destino_id, tipo, observacoes, atendido_por
  ) VALUES (
    v_unidade_id, _senha_guiche_id, v_ponto_id,
    _fila_destino_id, v_nova_senha.id, _tipo, _observacoes, auth.uid()
  );

  RETURN v_nova_senha;
END $$;

-- 11. finalizar_atendimento_com_retorno
CREATE OR REPLACE FUNCTION public.finalizar_atendimento_com_retorno(
  _atendimento_id uuid,
  _observacoes text DEFAULT NULL,
  _requer_retorno boolean DEFAULT false
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_unidade_id uuid;
  v_senha_id uuid;
  v_paciente_id uuid;
  v_fila_guiche uuid;
  v_nova_senha public.senhas;
  v_ini timestamptz;
  v_fim timestamptz := now();
  v_dur integer;
BEGIN
  SELECT unidade_id, senha_id, paciente_id, iniciado_em
  INTO v_unidade_id, v_senha_id, v_paciente_id, v_ini
  FROM public.atendimentos WHERE id = _atendimento_id;

  IF v_unidade_id IS NULL THEN RAISE EXCEPTION 'Atendimento não encontrado'; END IF;
  IF NOT belongs_to_unidade(auth.uid(), v_unidade_id) THEN
    RAISE EXCEPTION 'Sem permissão para esta unidade';
  END IF;

  v_dur := GREATEST(0, EXTRACT(EPOCH FROM (v_fim - v_ini))::int);

  UPDATE public.atendimentos
  SET finalizado_em = v_fim,
      duracao_segundos = v_dur,
      observacoes = NULLIF(trim(COALESCE(_observacoes, '')), ''),
      requer_retorno = _requer_retorno
  WHERE id = _atendimento_id;

  UPDATE public.senhas
  SET status = 'finalizada', finalizada_em = v_fim, updated_at = v_fim
  WHERE id = v_senha_id;

  IF _requer_retorno THEN
    v_fila_guiche := public.ensure_fila_guiche(v_unidade_id);

    SELECT * INTO v_nova_senha FROM public.gerar_senha(
      _fila_id => v_fila_guiche,
      _prioridade => 'normal',
      _paciente_id => v_paciente_id,
      _origem => 'retorno_pos_atendimento'
    );

    UPDATE public.senhas SET senha_origem_id = v_senha_id WHERE id = v_nova_senha.id;
    UPDATE public.atendimentos SET senha_retorno_id = v_nova_senha.id WHERE id = _atendimento_id;

    RETURN v_nova_senha.id;
  END IF;
  RETURN NULL;
END $$;
