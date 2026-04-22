CREATE TABLE public.tv_layout_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  config JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tv_layout_profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Perfis de layout são públicos para leitura"
ON public.tv_layout_profiles
FOR SELECT
USING (true);

CREATE POLICY "Admins inserem perfis de layout"
ON public.tv_layout_profiles
FOR INSERT
WITH CHECK (has_role_in_unidade(auth.uid(), unidade_id, 'admin'::app_role));

CREATE POLICY "Admins atualizam perfis de layout"
ON public.tv_layout_profiles
FOR UPDATE
USING (has_role_in_unidade(auth.uid(), unidade_id, 'admin'::app_role));

CREATE POLICY "Admins removem perfis de layout"
ON public.tv_layout_profiles
FOR DELETE
USING (has_role_in_unidade(auth.uid(), unidade_id, 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_tv_layout_profiles_updated_at
BEFORE UPDATE ON public.tv_layout_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
