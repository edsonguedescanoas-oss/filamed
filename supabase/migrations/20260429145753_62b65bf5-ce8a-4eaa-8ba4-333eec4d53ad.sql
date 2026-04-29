-- Atualizar tabela leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS ultimo_contato_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS workflow_atual UUID,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Tabela para armazenar as definições de workflows
CREATE TABLE IF NOT EXISTS public.workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    descricao TEXT,
    configuracao JSONB NOT NULL DEFAULT '{}'::jsonb, -- Armazena nós e conexões do React Flow
    status TEXT NOT NULL DEFAULT 'pausado', -- ativo, pausado
    execucoes_total INTEGER DEFAULT 0,
    sucesso_taxa DECIMAL(5,2) DEFAULT 0,
    usuario_id UUID REFERENCES auth.users(id),
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela para logs de execução de workflows
CREATE TABLE IF NOT EXISTS public.workflows_execucoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    trigger TEXT NOT NULL,
    data_execucao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT NOT NULL, -- sucesso, erro, em_andamento
    detalhes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows_execucoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Apenas usuários autenticados podem ver workflows"
ON public.workflows FOR SELECT TO authenticated USING (true);

CREATE POLICY "Apenas usuários autenticados podem gerenciar workflows"
ON public.workflows FOR ALL TO authenticated USING (true);

CREATE POLICY "Apenas usuários autenticados podem ver execuções"
ON public.workflows_execucoes FOR SELECT TO authenticated USING (true);

-- Trigger para updated_at em workflows
CREATE TRIGGER set_workflows_updated_at
BEFORE UPDATE ON public.workflows
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();