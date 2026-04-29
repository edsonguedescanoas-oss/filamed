-- Enum para status da demonstração se não existir
DO $$ BEGIN
    CREATE TYPE status_demonstracao AS ENUM ('agendada', 'confirmada', 'realizada', 'cancelada', 'nao_compareceu');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tabela de demonstrações
CREATE TABLE IF NOT EXISTS public.demonstracoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    vendedor_id UUID REFERENCES auth.users(id),
    data_hora TIMESTAMPTZ NOT NULL,
    status status_demonstracao NOT NULL DEFAULT 'agendada',
    link_videochamada TEXT,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.demonstracoes ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Leads podem inserir seus próprios agendamentos"
ON public.demonstracoes FOR INSERT
WITH CHECK (true); -- Permitir inserção pública para o formulário de agendamento

CREATE POLICY "Time comercial pode ver e atualizar agendamentos"
ON public.demonstracoes FOR ALL
USING (auth.role() = 'authenticated');

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.demonstracoes
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
