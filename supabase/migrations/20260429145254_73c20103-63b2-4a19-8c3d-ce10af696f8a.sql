-- Enum para estágios do pipeline
DO $$ BEGIN
    CREATE TYPE pipeline_stage AS ENUM (
        'novo_lead', 
        'contato_inicial', 
        'qualificacao', 
        'demonstracao', 
        'proposta', 
        'negociacao', 
        'fechado_ganho', 
        'fechado_perdido'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum para origem do lead
DO $$ BEGIN
    CREATE TYPE lead_source AS ENUM (
        'site', 
        'whatsapp', 
        'indicacao', 
        'evento', 
        'linkedin', 
        'ads', 
        'cold_email', 
        'parceiro'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum para temperatura do lead
DO $$ BEGIN
    CREATE TYPE lead_temperature AS ENUM (
        'frio', 
        'morno', 
        'quente'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum para tipo de interação
DO $$ BEGIN
    CREATE TYPE interaction_type AS ENUM (
        'whatsapp', 
        'email', 
        'ligacao', 
        'reuniao', 
        'tarefa', 
        'nota'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tabela de leads
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_clinica TEXT NOT NULL,
    cnpj TEXT,
    nome_contato TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    estagio_pipeline pipeline_stage NOT NULL DEFAULT 'novo_lead',
    origem_lead lead_source NOT NULL DEFAULT 'site',
    valor_potencial DECIMAL(12, 2) DEFAULT 0,
    temperatura_lead lead_temperature NOT NULL DEFAULT 'morno',
    responsavel_id UUID REFERENCES auth.users(id),
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de interações
CREATE TABLE IF NOT EXISTS public.interacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    tipo interaction_type NOT NULL DEFAULT 'nota',
    conteudo TEXT NOT NULL,
    usuario_id UUID NOT NULL REFERENCES auth.users(id),
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interacoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para leads
CREATE POLICY "Apenas usuários autenticados podem ver leads"
ON public.leads FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Apenas usuários autenticados podem inserir leads"
ON public.leads FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Apenas usuários autenticados podem atualizar leads"
ON public.leads FOR UPDATE
TO authenticated
USING (true);

-- Políticas RLS para interações
CREATE POLICY "Apenas usuários autenticados podem ver interações"
ON public.interacoes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Apenas usuários autenticados podem inserir interações"
ON public.interacoes FOR INSERT
TO authenticated
WITH CHECK (true);

-- Trigger para atualizar data_atualizacao em leads
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    NEW.data_atualizacao = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();