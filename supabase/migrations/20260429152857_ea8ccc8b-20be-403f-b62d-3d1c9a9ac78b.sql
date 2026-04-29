CREATE TABLE IF NOT EXISTS public.workflows_execucoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id TEXT, -- Opcional se for engine baseada em código
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    trigger TEXT NOT NULL,
    data_execucao TIMESTAMPTZ DEFAULT now(),
    status TEXT DEFAULT 'sucesso',
    detalhes JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.workflows_execucoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Time comercial pode ver logs de workflow"
ON public.workflows_execucoes FOR SELECT
USING (auth.role() = 'authenticated');
