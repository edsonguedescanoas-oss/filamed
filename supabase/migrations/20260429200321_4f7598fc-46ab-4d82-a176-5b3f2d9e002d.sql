CREATE TABLE IF NOT EXISTS public.waduk_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT,
  payload JSONB,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.waduk_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Política de leitura baseada na função is_super_admin que já existe no projeto
CREATE POLICY "Superadmins can view waduk logs" 
ON public.waduk_webhook_logs 
FOR SELECT 
USING (is_super_admin(auth.uid()));

-- Indexação para performance
CREATE INDEX IF NOT EXISTS idx_waduk_logs_created_at ON public.waduk_webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waduk_logs_event_type ON public.waduk_webhook_logs(event_type);