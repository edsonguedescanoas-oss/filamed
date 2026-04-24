-- Permitir leitura pública de senhas finalizadas, ausentes ou canceladas recentemente,
-- para que o ticket público (s/$token) receba o evento de UPDATE em tempo real
-- e exiba a tela de "atendimento finalizado".
DROP POLICY IF EXISTS "público lê somente senhas ativas" ON public.senhas;

CREATE POLICY "público lê senhas ativas e recentes"
ON public.senhas
FOR SELECT
TO anon
USING (
  status IN ('aguardando'::senha_status, 'chamada'::senha_status, 'em_atendimento'::senha_status)
  OR (
    status IN ('finalizada'::senha_status, 'ausente'::senha_status, 'cancelada'::senha_status)
    AND coalesce(finalizada_em, updated_at) > (now() - interval '30 minutes')
  )
);