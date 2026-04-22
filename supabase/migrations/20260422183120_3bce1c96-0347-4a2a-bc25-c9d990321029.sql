-- Adiciona colunas para layout de grid na tabela tv_visual_config
ALTER TABLE public.tv_visual_config 
ADD COLUMN IF NOT EXISTS layout_grid_cols INTEGER DEFAULT 12,
ADD COLUMN IF NOT EXISTS layout_grid_rows INTEGER DEFAULT 6,
ADD COLUMN IF NOT EXISTS layout_items JSONB DEFAULT '[
  {"type": "chamada_atual", "col_span": 8, "row_span": 6, "order": 1},
  {"type": "historico", "col_span": 4, "row_span": 6, "order": 2}
]'::jsonb;

-- Comentários para documentação
COMMENT ON COLUMN public.tv_visual_config.layout_grid_cols IS 'Número de colunas no grid do layout da TV';
COMMENT ON COLUMN public.tv_visual_config.layout_grid_rows IS 'Número de linhas no grid do layout da TV';
COMMENT ON COLUMN public.tv_visual_config.layout_items IS 'Configuração dos itens do layout (tipo, col_span, row_span, etc)';