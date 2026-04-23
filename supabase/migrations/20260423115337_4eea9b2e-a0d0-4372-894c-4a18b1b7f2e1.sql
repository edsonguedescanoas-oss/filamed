-- Adiciona colunas para customização do ticket térmico
ALTER TABLE public.unidades 
ADD COLUMN IF NOT EXISTS ticket_logo_url TEXT,
ADD COLUMN IF NOT EXISTS ticket_unidade_nome TEXT,
ADD COLUMN IF NOT EXISTS ticket_rodape TEXT;

-- Comentários para documentação
COMMENT ON COLUMN public.unidades.ticket_logo_url IS 'URL da logo personalizada para impressão no ticket térmico 80mm';
COMMENT ON COLUMN public.unidades.ticket_unidade_nome IS 'Nome da unidade customizado para o ticket (se nulo, usa o nome padrão da unidade)';
COMMENT ON COLUMN public.unidades.ticket_rodape IS 'Texto personalizado para o rodapé do ticket térmico';
