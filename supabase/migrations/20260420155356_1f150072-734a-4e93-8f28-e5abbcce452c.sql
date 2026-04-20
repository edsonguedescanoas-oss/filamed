-- Permite que o painel TV (acessado de forma pública/anônima) receba
-- atualizações em tempo real de chamadas e senhas. Sem essas policies,
-- o Realtime do Postgres descarta silenciosamente os payloads para o role
-- 'anon', o que fazia a TV só funcionar em dispositivos onde o usuário já
-- estava autenticado em outra aba (sessão compartilhada).
--
-- O escopo é minimalista e equivalente ao que as RPCs públicas
-- (get_chamadas_recentes, get_senhas_ativas) já expõem hoje:
--   - chamadas: apenas dos últimos 5 minutos
--   - senhas: apenas em estado ativo (aguardando/chamada/em_atendimento)
-- Nenhuma coluna sensível (paciente_id, token_publico, observacao)
-- precisa ser ocultada para anon nessas tabelas, mas mantemos a janela
-- restrita para evitar varredura do histórico.

CREATE POLICY "público lê chamadas recentes"
  ON public.chamadas
  FOR SELECT
  TO anon
  USING (created_at > now() - interval '5 minutes');

CREATE POLICY "público lê senhas ativas"
  ON public.senhas
  FOR SELECT
  TO anon
  USING (status IN ('aguardando','chamada','em_atendimento'));