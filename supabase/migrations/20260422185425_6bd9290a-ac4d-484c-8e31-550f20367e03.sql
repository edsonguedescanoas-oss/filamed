ALTER TABLE public.tv_visual_config 
ADD COLUMN IF NOT EXISTS historico_limite INTEGER DEFAULT 8;