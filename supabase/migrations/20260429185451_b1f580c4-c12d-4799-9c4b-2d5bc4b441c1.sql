-- Tabela para armazenar conflitos detectados
CREATE TABLE IF NOT EXISTS public.agenda_conflitos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    demonstracao_id UUID REFERENCES public.demonstracoes(id) ON DELETE CASCADE,
    evento_externo_id TEXT, -- ID do evento no Google/Outlook
    tipo_calendario TEXT, -- 'google' | 'outlook'
    descricao TEXT,
    data_conflito TIMESTAMPTZ,
    resolvido BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agenda_conflitos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Time interno pode ver conflitos" ON public.agenda_conflitos
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND (
            auth.users.raw_app_meta_data->>'role' = 'admin' OR 
            auth.users.raw_app_meta_data->>'role' = 'comercial'
        )
    )
);

-- Função para verificar conflitos (pode ser chamada via RPC ou Trigger)
CREATE OR REPLACE FUNCTION public.check_agenda_conflict(
    p_vendedor_id UUID,
    p_inicio TIMESTAMPTZ,
    p_fim TIMESTAMPTZ,
    p_ignore_id UUID DEFAULT NULL
)
RETURNS TABLE (conflito_id UUID, tipo TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT id, 'interna'::TEXT
    FROM public.demonstracoes
    WHERE vendedor_id = p_vendedor_id
      AND status != 'cancelada'
      AND id != COALESCE(p_ignore_id, '00000000-0000-0000-0000-000000000000'::UUID)
      AND (
          (data_hora, data_hora + interval '1 hour') OVERLAPS (p_inicio, p_fim)
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
