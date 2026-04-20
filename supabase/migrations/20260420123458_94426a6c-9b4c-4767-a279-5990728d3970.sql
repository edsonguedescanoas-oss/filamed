-- Atualiza planos com price IDs do gateway de pagamentos
UPDATE public.planos SET gateway_price_id_mensal = 'starter_monthly', gateway_price_id_anual = 'starter_yearly' WHERE slug = 'starter';
UPDATE public.planos SET gateway_price_id_mensal = 'pro_monthly', gateway_price_id_anual = 'pro_yearly' WHERE slug = 'pro';
UPDATE public.planos SET gateway_price_id_mensal = 'enterprise_monthly', gateway_price_id_anual = 'enterprise_yearly' WHERE slug = 'enterprise';

-- Tabela de idempotência para webhooks
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'sandbox',
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT webhook_events_unique UNIQUE (gateway, event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON public.webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed_at ON public.webhook_events(processed_at DESC);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admin lê webhook_events"
  ON public.webhook_events FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));