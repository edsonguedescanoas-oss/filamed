DROP POLICY IF EXISTS "equipe registra chamadas" ON public.chamadas;

CREATE POLICY "equipe registra chamadas por ponto permitido"
ON public.chamadas
FOR INSERT
TO authenticated
WITH CHECK (
  belongs_to_unidade(auth.uid(), unidade_id)
  AND chamado_por = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.pontos_atendimento pa
    WHERE pa.unidade_id = chamadas.unidade_id
      AND pa.nome = chamadas.destino
      AND pa.ativo = true
      AND public.pode_ocupar_ponto(auth.uid(), pa.id)
  )
);