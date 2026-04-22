ALTER TABLE public.tv_visual_config ADD COLUMN IF NOT EXISTS aspect_ratio TEXT NOT NULL DEFAULT '16:9';

-- Update existing rows to have the default value if not already set
UPDATE public.tv_visual_config SET aspect_ratio = '16:9' WHERE aspect_ratio IS NULL;