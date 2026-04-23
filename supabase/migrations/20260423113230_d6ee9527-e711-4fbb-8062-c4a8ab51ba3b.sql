-- Add estimated wait time column to filas
ALTER TABLE public.filas
ADD COLUMN IF NOT EXISTS tempo_espera_estimado INTEGER DEFAULT 10;

COMMENT ON COLUMN public.filas.tempo_espera_estimado IS 'Tempo de espera estimado por pessoa na fila em minutos';