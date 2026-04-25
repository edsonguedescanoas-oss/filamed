-- Garantir função de timestamp existe
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar tabela de revendas
CREATE TABLE public.revendas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    email_contato TEXT,
    telefone_contato TEXT,
    logo_url TEXT,
    configuracoes JSONB DEFAULT '{}'::jsonb,
    ativa BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.revendas ENABLE ROW LEVEL SECURITY;

-- Políticas para revendas
CREATE POLICY "Revendas visíveis por super admins"
ON public.revendas FOR SELECT
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins podem gerenciar revendas"
ON public.revendas FOR ALL
USING (public.is_super_admin(auth.uid()));

-- Adicionar coluna de revenda_id nas unidades
ALTER TABLE public.unidades 
ADD COLUMN revenda_id UUID REFERENCES public.revendas(id);

-- Criar tabela de usuários das revendas
CREATE TABLE public.revenda_usuarios (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    revenda_id UUID NOT NULL REFERENCES public.revendas(id) ON DELETE CASCADE,
    nivel TEXT NOT NULL DEFAULT 'vendedor' CHECK (nivel IN ('dono', 'gerente', 'vendedor')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(profile_id, revenda_id)
);

-- Habilitar RLS
ALTER TABLE public.revenda_usuarios ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Usuários de revenda podem ver seus vínculos"
ON public.revenda_usuarios FOR SELECT
USING (auth.uid() = profile_id OR public.is_super_admin(auth.uid()));

-- Função auxiliar
CREATE OR REPLACE FUNCTION public.get_user_revenda_id(p_uid UUID)
RETURNS UUID AS $$
    SELECT revenda_id FROM public.revenda_usuarios WHERE profile_id = p_uid LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Trigger para unidades (ajuste de política)
CREATE POLICY "Revendedores podem ver unidades vinculadas"
ON public.unidades FOR SELECT
USING (revenda_id = public.get_user_revenda_id(auth.uid()));

-- Trigger de timestamp
CREATE TRIGGER update_revendas_updated_at
BEFORE UPDATE ON public.revendas
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();