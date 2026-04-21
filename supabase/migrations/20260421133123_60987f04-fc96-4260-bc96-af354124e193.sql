CREATE TABLE public.tv_visual_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id uuid NOT NULL UNIQUE REFERENCES public.unidades(id) ON DELETE CASCADE,
  cor_primaria text NOT NULL DEFAULT '#3B82F6',
  cor_fundo text NOT NULL DEFAULT '#0F172A',
  cor_texto text NOT NULL DEFAULT '#F8FAFC',
  logo_url text,
  fundo_url text,
  resolucao_preset text NOT NULL DEFAULT 'fhd',
  escala_fonte numeric NOT NULL DEFAULT 1.0 CHECK (escala_fonte >= 0.5 AND escala_fonte <= 1.5),
  densidade text NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tv_visual_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tv visual config é público para leitura"
  ON public.tv_visual_config FOR SELECT
  USING (true);

CREATE POLICY "admins inserem tv visual config"
  ON public.tv_visual_config FOR INSERT
  TO authenticated
  WITH CHECK (has_role_in_unidade(auth.uid(), unidade_id, 'admin'::app_role));

CREATE POLICY "admins atualizam tv visual config"
  ON public.tv_visual_config FOR UPDATE
  TO authenticated
  USING (has_role_in_unidade(auth.uid(), unidade_id, 'admin'::app_role))
  WITH CHECK (has_role_in_unidade(auth.uid(), unidade_id, 'admin'::app_role));

CREATE POLICY "admins removem tv visual config"
  ON public.tv_visual_config FOR DELETE
  TO authenticated
  USING (has_role_in_unidade(auth.uid(), unidade_id, 'admin'::app_role));

CREATE TRIGGER set_tv_visual_config_updated_at
  BEFORE UPDATE ON public.tv_visual_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();