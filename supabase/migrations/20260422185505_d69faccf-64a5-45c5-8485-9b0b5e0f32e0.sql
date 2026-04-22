ALTER TABLE public.tv_visual_config 
ADD COLUMN IF NOT EXISTS historico_quebrar_texto BOOLEAN DEFAULT FALSE;