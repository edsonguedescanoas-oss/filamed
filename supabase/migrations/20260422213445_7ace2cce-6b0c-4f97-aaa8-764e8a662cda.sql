-- Permite que admin e recepção da unidade apaguem chamadas (usado pelo botão "Resetar histórico" da Recepção)
CREATE POLICY "equipe apaga chamadas"
ON public.chamadas
FOR DELETE
TO authenticated
USING (
  belongs_to_unidade(auth.uid(), unidade_id)
  AND (
    has_role_in_unidade(auth.uid(), unidade_id, 'admin'::app_role)
    OR has_role_in_unidade(auth.uid(), unidade_id, 'recepcao'::app_role)
  )
);