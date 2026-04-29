ALTER TABLE public.workflows_execucoes ADD COLUMN tipo_acao TEXT;

-- Update existing records if any (not likely based on earlier check)
UPDATE public.workflows_execucoes SET tipo_acao = 'unknown' WHERE tipo_acao IS NULL;