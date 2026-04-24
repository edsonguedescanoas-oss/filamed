-- Create table for triage criteria/rules
CREATE TABLE public.triagem_criterios (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    prioridade public.senha_prioridade NOT NULL DEFAULT 'normal',
    ativo BOOLEAN NOT NULL DEFAULT true,
    ordem INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.triagem_criterios ENABLE ROW LEVEL SECURITY;

-- Policies for triagem_criterios
CREATE POLICY "Users can view criteria of their own unit"
ON public.triagem_criterios
FOR SELECT
USING (unidade_id IN (
    SELECT unidade_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Admins can manage criteria of their own unit"
ON public.triagem_criterios
FOR ALL
USING (
    unidade_id IN (
        SELECT p.unidade_id FROM public.profiles p WHERE p.id = auth.uid()
    ) AND (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() 
            AND ur.role IN ('admin', 'super_admin')
        )
    )
);

-- Add triage data to senhas
ALTER TABLE public.senhas
ADD COLUMN IF NOT EXISTS triagem_dados JSONB;

-- Trigger for updated_at
CREATE TRIGGER update_triagem_criterios_updated_at
BEFORE UPDATE ON public.triagem_criterios
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();