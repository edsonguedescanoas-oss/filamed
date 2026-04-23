-- Add idempotency_key to chamadas
ALTER TABLE public.chamadas 
ADD COLUMN idempotency_key TEXT UNIQUE;

-- Add index
CREATE INDEX idx_chamadas_idempotency_key ON public.chamadas(idempotency_key);