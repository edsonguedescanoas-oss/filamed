ALTER TABLE public.unidade_voice_config
ADD COLUMN IF NOT EXISTS template_chamada text NOT NULL DEFAULT 'paciente_senha_fila';

-- Restringe a valores conhecidos via CHECK (imutável, sem time-based logic)
ALTER TABLE public.unidade_voice_config
DROP CONSTRAINT IF EXISTS unidade_voice_config_template_chamada_check;

ALTER TABLE public.unidade_voice_config
ADD CONSTRAINT unidade_voice_config_template_chamada_check
CHECK (template_chamada IN (
  'paciente_senha_fila',
  'paciente_senha_fila_destino',
  'paciente_senha_destino',
  'senha_destino',
  'senha_fila'
));