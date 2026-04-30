-- Índices para CRM Conversas
CREATE INDEX IF NOT EXISTS idx_crm_conversas_ultima_msg ON public.crm_conversas (ultima_mensagem_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_conversas_contato_id ON public.crm_conversas (contato_id);

-- Índices para CRM Mensagens
CREATE INDEX IF NOT EXISTS idx_crm_mensagens_conversa_id ON public.crm_mensagens (conversa_id);
CREATE INDEX IF NOT EXISTS idx_crm_mensagens_created_at ON public.crm_mensagens (created_at ASC);

-- Índices para CRM Agentes
CREATE INDEX IF NOT EXISTS idx_crm_agentes_nome ON public.crm_agentes (nome);

-- Índices para Profiles (busca)
CREATE INDEX IF NOT EXISTS idx_profiles_nome_completo ON public.profiles (nome_completo);
