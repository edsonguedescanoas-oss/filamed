-- Adicionar índice único parcial para evitar duplicidade de notificações enviadas
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_enviada_notificacao 
ON public.notificacoes_log (senha_id, destinatario, md5(mensagem)) 
WHERE (status = 'enviada' AND senha_id IS NOT NULL);

-- Adicionamos md5(mensagem) para lidar com o tamanho do campo texto no índice
-- Isso garante que a mesma mensagem para a mesma senha e destinatário não seja enviada duas vezes.