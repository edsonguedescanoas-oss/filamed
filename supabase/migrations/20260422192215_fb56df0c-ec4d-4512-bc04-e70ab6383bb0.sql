ALTER TABLE public.tv_visual_config 
ADD COLUMN zoom_nivel NUMERIC DEFAULT 1.0,
ADD COLUMN safe_area_padding NUMERIC DEFAULT 0.0;

-- Atualizar tipos no tv_layout_profiles se necessário? 
-- Eles guardam o JSON inteiro da config, então já vão suportar os novos campos se salvos.