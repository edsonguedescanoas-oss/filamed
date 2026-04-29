-- Tabela de auditoria
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES auth.users(id),
    acao TEXT NOT NULL,
    entidade TEXT NOT NULL,
    entidade_id UUID,
    data_hora TIMESTAMPTZ DEFAULT now(),
    ip_address TEXT,
    detalhes JSONB
);

-- Habilitar RLS no audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver logs de auditoria
CREATE POLICY "Admins podem ver logs de auditoria"
ON public.audit_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND (auth.users.raw_app_meta_data->>'role' = 'admin')
  )
);

-- Função genérica de auditoria
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_log (usuario_id, acao, entidade, entidade_id, detalhes)
    VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id 
            ELSE NEW.id 
        END,
        CASE 
            WHEN TG_OP = 'INSERT' THEN jsonb_build_object('new', to_jsonb(NEW))
            WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
            ELSE jsonb_build_object('old', to_jsonb(OLD))
        END
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar auditoria nas tabelas principais
DROP TRIGGER IF EXISTS audit_leads ON public.leads;
CREATE TRIGGER audit_leads AFTER INSERT OR UPDATE OR DELETE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS audit_demonstracoes ON public.demonstracoes;
CREATE TRIGGER audit_demonstracoes AFTER INSERT OR UPDATE OR DELETE ON public.demonstracoes FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- Reforçar políticas RLS para time interno (Admin/Comercial)
DO $$ 
DECLARE 
    t TEXT;
    tables TEXT[] := ARRAY['leads', 'interacoes', 'demonstracoes', 'workflows_execucoes', 'workflows'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
        EXECUTE format('DROP POLICY IF EXISTS "Acesso time interno" ON public.%I;', t);
        EXECUTE format('CREATE POLICY "Acesso time interno" ON public.%I FOR ALL USING (
            EXISTS (
                SELECT 1 FROM auth.users 
                WHERE auth.users.id = auth.uid() 
                AND (
                    auth.users.raw_app_meta_data->>''role'' = ''admin'' OR 
                    auth.users.raw_app_meta_data->>''role'' = ''comercial''
                )
            )
        );', t);
    END LOOP;
END $$;

-- Permitir agendamento público em demonstracoes (INSERT apenas)
DROP POLICY IF EXISTS "Agendamento público" ON public.demonstracoes;
CREATE POLICY "Agendamento público" ON public.demonstracoes FOR INSERT WITH CHECK (true);
