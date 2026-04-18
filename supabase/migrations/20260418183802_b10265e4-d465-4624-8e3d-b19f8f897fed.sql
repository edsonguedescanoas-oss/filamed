-- Tabela de configuração de voz por unidade
CREATE TABLE public.unidade_voice_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unidade_id UUID NOT NULL UNIQUE REFERENCES public.unidades(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'browser', -- 'browser' | 'google' | 'elevenlabs'
  voice_id TEXT, -- voiceURI (browser), voice name (google) ou voice_id (elevenlabs)
  rate NUMERIC NOT NULL DEFAULT 0.95,
  pitch NUMERIC NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.unidade_voice_config ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário (mesmo anônimo) pode LER a config da unidade — necessário para o painel TV público
CREATE POLICY "Voice config é público para leitura"
ON public.unidade_voice_config
FOR SELECT
USING (true);

-- Apenas admins da unidade podem INSERT/UPDATE/DELETE
CREATE POLICY "Admins da unidade podem inserir voice config"
ON public.unidade_voice_config
FOR INSERT
TO authenticated
WITH CHECK (public.has_role_in_unidade(auth.uid(), unidade_id, 'admin'::app_role));

CREATE POLICY "Admins da unidade podem atualizar voice config"
ON public.unidade_voice_config
FOR UPDATE
TO authenticated
USING (public.has_role_in_unidade(auth.uid(), unidade_id, 'admin'::app_role))
WITH CHECK (public.has_role_in_unidade(auth.uid(), unidade_id, 'admin'::app_role));

CREATE POLICY "Admins da unidade podem remover voice config"
ON public.unidade_voice_config
FOR DELETE
TO authenticated
USING (public.has_role_in_unidade(auth.uid(), unidade_id, 'admin'::app_role));

CREATE TRIGGER set_updated_at_unidade_voice_config
BEFORE UPDATE ON public.unidade_voice_config
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();