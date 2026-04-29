-- Enum para status da demonstração
DO $$ BEGIN
    CREATE TYPE demo_status AS ENUM (
        'agendada', 
        'confirmada', 
        'realizada', 
        'cancelada', 
        'nao_compareceu'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tabela de demonstrações
CREATE TABLE IF NOT EXISTS public.demonstracoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
    status demo_status NOT NULL DEFAULT 'agendada',
    link_videochamada TEXT,
    notas TEXT,
    vendedor_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.demonstracoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Permitir que qualquer pessoa insira (para o lead agendar publicamente)
-- Em produção, isso seria validado por um token ou e-mail do lead
CREATE POLICY "Leads podem agendar demonstrações"
ON public.demonstracoes FOR INSERT
TO public
WITH CHECK (true);

-- Apenas usuários autenticados (comercial) podem ver e atualizar
CREATE POLICY "Time comercial pode ver demonstrações"
ON public.demonstracoes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Time comercial pode atualizar demonstrações"
ON public.demonstracoes FOR UPDATE
TO authenticated
USING (true);

-- Trigger para updated_at
CREATE TRIGGER set_demonstracoes_updated_at
BEFORE UPDATE ON public.demonstracoes
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();