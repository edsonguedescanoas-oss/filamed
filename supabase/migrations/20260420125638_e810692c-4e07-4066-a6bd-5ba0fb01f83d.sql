ALTER TABLE public.planos
ADD COLUMN IF NOT EXISTS gateway_price_id_anual_oneoff text;

UPDATE public.planos SET gateway_price_id_anual_oneoff = 'starter_yearly_oneoff' WHERE slug = 'starter';
UPDATE public.planos SET gateway_price_id_anual_oneoff = 'pro_yearly_oneoff' WHERE slug = 'pro';
UPDATE public.planos SET gateway_price_id_anual_oneoff = 'enterprise_yearly_oneoff' WHERE slug = 'enterprise';