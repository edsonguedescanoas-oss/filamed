ALTER TABLE public.tv_visual_config 
  DROP CONSTRAINT IF EXISTS tv_visual_config_escala_chamadas_check;

ALTER TABLE public.tv_visual_config 
  ADD CONSTRAINT tv_visual_config_escala_chamadas_check 
  CHECK (escala_chamadas >= 0.3 AND escala_chamadas <= 3.0);

ALTER TABLE public.tv_visual_config 
  DROP CONSTRAINT IF EXISTS tv_visual_config_escala_fonte_check;

ALTER TABLE public.tv_visual_config 
  ADD CONSTRAINT tv_visual_config_escala_fonte_check 
  CHECK (escala_fonte >= 0.3 AND escala_fonte <= 2.0);