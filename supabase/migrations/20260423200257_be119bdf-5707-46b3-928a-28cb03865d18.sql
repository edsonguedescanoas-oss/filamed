CREATE TABLE IF NOT EXISTS public.ponto_atendimento_permissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  ponto_atendimento_id UUID NOT NULL REFERENCES public.pontos_atendimento(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (ponto_atendimento_id, user_id)
);

ALTER TABLE public.ponto_atendimento_permissoes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ponto_permissoes_unidade ON public.ponto_atendimento_permissoes(unidade_id);
CREATE INDEX IF NOT EXISTS idx_ponto_permissoes_ponto ON public.ponto_atendimento_permissoes(ponto_atendimento_id);
CREATE INDEX IF NOT EXISTS idx_ponto_permissoes_user ON public.ponto_atendimento_permissoes(user_id);

DROP POLICY IF EXISTS "ler permissoes de pontos da unidade" ON public.ponto_atendimento_permissoes;
CREATE POLICY "ler permissoes de pontos da unidade"
ON public.ponto_atendimento_permissoes
FOR SELECT
TO authenticated
USING (public.belongs_to_unidade(auth.uid(), unidade_id));

DROP POLICY IF EXISTS "admin gestor gerencia permissoes de pontos" ON public.ponto_atendimento_permissoes;
CREATE POLICY "admin gestor gerencia permissoes de pontos"
ON public.ponto_atendimento_permissoes
FOR ALL
TO authenticated
USING (
  public.has_role_in_unidade(auth.uid(), unidade_id, 'admin'::public.app_role)
  OR public.has_role_in_unidade(auth.uid(), unidade_id, 'gestor'::public.app_role)
)
WITH CHECK (
  public.has_role_in_unidade(auth.uid(), unidade_id, 'admin'::public.app_role)
  OR public.has_role_in_unidade(auth.uid(), unidade_id, 'gestor'::public.app_role)
);

DROP POLICY IF EXISTS "super admin gerencia permissoes de pontos" ON public.ponto_atendimento_permissoes;
CREATE POLICY "super admin gerencia permissoes de pontos"
ON public.ponto_atendimento_permissoes
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "admin gestor gerencia pontos" ON public.pontos_atendimento;
CREATE POLICY "admin gestor gerencia pontos"
ON public.pontos_atendimento
FOR ALL
TO authenticated
USING (
  public.has_role_in_unidade(auth.uid(), unidade_id, 'admin'::public.app_role)
  OR public.has_role_in_unidade(auth.uid(), unidade_id, 'gestor'::public.app_role)
)
WITH CHECK (
  public.has_role_in_unidade(auth.uid(), unidade_id, 'admin'::public.app_role)
  OR public.has_role_in_unidade(auth.uid(), unidade_id, 'gestor'::public.app_role)
);

CREATE OR REPLACE FUNCTION public.pode_ocupar_ponto(_user_id UUID, _ponto_atendimento_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ponto AS (
    SELECT id, unidade_id
    FROM public.pontos_atendimento
    WHERE id = _ponto_atendimento_id
      AND ativo = true
  )
  SELECT EXISTS (
    SELECT 1
    FROM ponto p
    WHERE public.belongs_to_unidade(_user_id, p.unidade_id)
      AND (
        NOT EXISTS (
          SELECT 1
          FROM public.ponto_atendimento_permissoes pp
          WHERE pp.ponto_atendimento_id = p.id
        )
        OR EXISTS (
          SELECT 1
          FROM public.ponto_atendimento_permissoes pp
          WHERE pp.ponto_atendimento_id = p.id
            AND pp.user_id = _user_id
        )
        OR public.has_role_in_unidade(_user_id, p.unidade_id, 'admin'::public.app_role)
        OR public.has_role_in_unidade(_user_id, p.unidade_id, 'gestor'::public.app_role)
        OR public.is_super_admin(_user_id)
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.chamar_senha_do_ponto(_senha_id UUID, _ponto_atendimento_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_senha public.senhas%ROWTYPE;
  v_ponto public.pontos_atendimento%ROWTYPE;
  v_user UUID := auth.uid();
  v_chamada_id UUID;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT * INTO v_senha
  FROM public.senhas
  WHERE id = _senha_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Senha não encontrada';
  END IF;

  SELECT * INTO v_ponto
  FROM public.pontos_atendimento
  WHERE id = _ponto_atendimento_id;

  IF NOT FOUND OR v_ponto.ativo IS NOT TRUE THEN
    RAISE EXCEPTION 'Ponto de atendimento inválido ou inativo';
  END IF;

  IF v_ponto.unidade_id <> v_senha.unidade_id THEN
    RAISE EXCEPTION 'Ponto e senha pertencem a unidades diferentes';
  END IF;

  IF NOT public.pode_ocupar_ponto(v_user, _ponto_atendimento_id) THEN
    RAISE EXCEPTION 'Usuário sem permissão para operar este ponto';
  END IF;

  INSERT INTO public.chamadas (unidade_id, senha_id, destino, chamado_por)
  VALUES (v_senha.unidade_id, v_senha.id, v_ponto.nome, v_user)
  RETURNING id INTO v_chamada_id;

  UPDATE public.senhas
  SET status = 'chamada'::public.senha_status,
      updated_at = now()
  WHERE id = v_senha.id;

  RETURN v_chamada_id;
END;
$$;