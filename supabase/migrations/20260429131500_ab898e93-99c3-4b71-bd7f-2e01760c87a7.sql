-- CRM Tables
CREATE TABLE IF NOT EXISTS public.crm_contatos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT,
    telefone TEXT NOT NULL,
    email TEXT,
    unidade_id UUID REFERENCES public.unidades(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(telefone)
);

CREATE TABLE IF NOT EXISTS public.crm_agentes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT,
    foto_url TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id)
);

CREATE TYPE public.crm_conversa_status AS ENUM ('aberto', 'pendente', 'resolvido', 'arquivado');

CREATE TABLE IF NOT EXISTS public.crm_conversas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contato_id UUID NOT NULL REFERENCES public.crm_contatos(id) ON DELETE CASCADE,
    agente_id UUID REFERENCES public.crm_agentes(id) ON DELETE SET NULL,
    status public.crm_conversa_status DEFAULT 'aberto',
    ultima_mensagem_preview TEXT,
    ultima_mensagem_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TYPE public.crm_mensagem_direcao AS ENUM ('entrada', 'saida');
CREATE TYPE public.crm_mensagem_tipo AS ENUM ('whatsapp', 'sistema', 'nota');

CREATE TABLE IF NOT EXISTS public.crm_mensagens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversa_id UUID NOT NULL REFERENCES public.crm_conversas(id) ON DELETE CASCADE,
    agente_id UUID REFERENCES public.crm_agentes(id) ON DELETE SET NULL,
    conteudo TEXT NOT NULL,
    direcao public.crm_mensagem_direcao NOT NULL,
    tipo public.crm_mensagem_tipo DEFAULT 'whatsapp',
    wa_message_id TEXT, -- ID retornado pelo WaDuck ou WhatsApp
    wa_status TEXT,     -- sent, delivered, read, failed
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_agentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_config ENABLE ROW LEVEL SECURITY;

-- Policies for SuperAdmin (only they can see everything for now)
CREATE POLICY "SuperAdmins can do everything on CRM"
ON public.crm_contatos
FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
));

CREATE POLICY "SuperAdmins can do everything on CRM Agentes"
ON public.crm_agentes
FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
));

CREATE POLICY "SuperAdmins can do everything on CRM Conversas"
ON public.crm_conversas
FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
));

CREATE POLICY "SuperAdmins can do everything on CRM Mensagens"
ON public.crm_mensagens
FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
));

CREATE POLICY "SuperAdmins can do everything on CRM Config"
ON public.crm_config
FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
));

-- Function to update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_crm_contatos_updated_at BEFORE UPDATE ON public.crm_contatos FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_crm_agentes_updated_at BEFORE UPDATE ON public.crm_agentes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_crm_conversas_updated_at BEFORE UPDATE ON public.crm_conversas FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger to update conversation preview and timestamp when a message is added
CREATE OR REPLACE FUNCTION public.handle_new_crm_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.crm_conversas
    SET ultima_mensagem_preview = left(NEW.conteudo, 100),
        ultima_mensagem_at = NEW.created_at,
        updated_at = now()
    WHERE id = NEW.conversa_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_new_crm_message
AFTER INSERT ON public.crm_mensagens
FOR EACH ROW EXECUTE FUNCTION public.handle_new_crm_message();
