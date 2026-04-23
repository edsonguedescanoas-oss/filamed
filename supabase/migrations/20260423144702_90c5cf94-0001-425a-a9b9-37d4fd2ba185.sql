-- Add idempotency_key to notificacoes_log
ALTER TABLE public.notificacoes_log 
ADD COLUMN idempotency_key TEXT UNIQUE;

-- Add index for faster lookups
CREATE INDEX idx_notificacoes_log_idempotency_key ON public.notificacoes_log(idempotency_key);