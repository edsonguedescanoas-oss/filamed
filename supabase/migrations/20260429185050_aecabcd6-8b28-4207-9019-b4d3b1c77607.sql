CREATE TABLE IF NOT EXISTS public.workflow_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL, -- 'whatsapp' | 'email'
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending' | 'processing' | 'completed' | 'failed'
    attempts INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.workflow_queue ENABLE ROW LEVEL SECURITY;
-- Apenas sistema (service role) ou admins gerenciam a fila
CREATE POLICY "Acesso restrito fila" ON public.workflow_queue FOR ALL USING (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND (auth.users.raw_app_meta_data->>'role' = 'admin')
    )
);
