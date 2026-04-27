-- Tabela para armazenar alertas de falha
CREATE TABLE IF NOT EXISTS public.notificacoes_alertas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unidade_id UUID REFERENCES public.unidades(id) ON DELETE CASCADE,
    senha_id UUID REFERENCES public.senhas(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL, -- 'whatsapp_failure'
    mensagem TEXT NOT NULL,
    detalhes JSONB,
    resolvido BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.notificacoes_alertas ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (Admins podem ver)
CREATE POLICY "Admins podem visualizar alertas"
ON public.notificacoes_alertas
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem atualizar alertas (marcar como resolvido)"
ON public.notificacoes_alertas
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Função para o trigger de notificação de falha
CREATE OR REPLACE FUNCTION public.fn_trigger_alerta_falha_notificacao()
RETURNS TRIGGER AS $$
BEGIN
    -- Se a notificação falhou e for do canal whatsapp
    IF (NEW.status = 'falhou' AND NEW.canal = 'whatsapp') THEN
        INSERT INTO public.notificacoes_alertas (
            unidade_id,
            senha_id,
            tipo,
            mensagem,
            detalhes
        ) VALUES (
            NEW.unidade_id,
            NEW.senha_id,
            'whatsapp_failure',
            'Falha no envio de WhatsApp para ' || COALESCE(NEW.destinatario, 'N/A'),
            jsonb_build_object(
                'erro', NEW.erro,
                'log_id', NEW.id,
                'destinatario', NEW.destinatario
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger na tabela de logs
DROP TRIGGER IF EXISTS tr_alerta_falha_notificacao ON public.notificacoes_log;
CREATE TRIGGER tr_alerta_falha_notificacao
AFTER INSERT ON public.notificacoes_log
FOR EACH ROW
EXECUTE FUNCTION public.fn_trigger_alerta_falha_notificacao();
