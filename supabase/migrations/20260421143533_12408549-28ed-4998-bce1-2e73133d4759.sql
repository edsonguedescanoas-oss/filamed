ALTER TABLE public.tv_visual_config
  ADD COLUMN IF NOT EXISTS contraste_chamadas text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS escala_chamadas numeric NOT NULL DEFAULT 1.0;

-- Garante valores válidos via trigger (CHECK constraints fixas funcionam aqui pq são imutáveis)
ALTER TABLE public.tv_visual_config
  DROP CONSTRAINT IF EXISTS tv_visual_config_contraste_chamadas_check;
ALTER TABLE public.tv_visual_config
  ADD CONSTRAINT tv_visual_config_contraste_chamadas_check
  CHECK (contraste_chamadas IN ('normal', 'alto', 'maximo'));

ALTER TABLE public.tv_visual_config
  DROP CONSTRAINT IF EXISTS tv_visual_config_escala_chamadas_check;
ALTER TABLE public.tv_visual_config
  ADD CONSTRAINT tv_visual_config_escala_chamadas_check
  CHECK (escala_chamadas >= 0.6 AND escala_chamadas <= 2.5);