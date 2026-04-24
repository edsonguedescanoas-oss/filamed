ALTER TABLE public.triagem_criterios 
ADD COLUMN IF NOT EXISTS regras JSONB DEFAULT '{"logic": "AND", "rules": []}'::jsonb;

-- Update existing records if any (though we saw it's empty)
UPDATE public.triagem_criterios 
SET regras = '{"logic": "AND", "rules": []}'::jsonb 
WHERE regras IS NULL;

COMMENT ON COLUMN public.triagem_criterios.regras IS 'Armazena a estrutura de árvore de regras para triagem automática (RuleGroup).';