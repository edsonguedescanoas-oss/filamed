-- Add whatsapp_config to unidades
ALTER TABLE public.unidades
ADD COLUMN IF NOT EXISTS whatsapp_config JSONB DEFAULT '{}'::jsonb;

-- Add tempo_espera_estimado to senhas
ALTER TABLE public.senhas
ADD COLUMN IF NOT EXISTS tempo_espera_estimado INTEGER;

-- Ensure notificacoes_log is ready
CREATE TABLE IF NOT EXISTS public.notificacoes_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unidade_id UUID REFERENCES public.unidades(id),
    paciente_id UUID REFERENCES public.pacientes(id),
    senha_id UUID REFERENCES public.senhas(id),
    canal public.canal_notificacao NOT NULL,
    status TEXT NOT NULL, -- 'sucesso', 'erro'
    mensagem TEXT,
    erro_detalhe TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for notificacoes_log
ALTER TABLE public.notificacoes_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e gestores podem ver logs de notificacao"
ON public.notificacoes_log
FOR SELECT
USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND unidade_id = notificacoes_log.unidade_id AND has_role(id, 'gestor'::app_role)
    )
);
