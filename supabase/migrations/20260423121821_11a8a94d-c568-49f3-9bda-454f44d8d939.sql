DROP POLICY "equipe gerencia senhas" ON public.senhas;

CREATE POLICY "equipe gerencia senhas"
ON public.senhas
FOR ALL
USING (
  belongs_to_unidade(auth.uid(), unidade_id)
  AND (
    has_role_in_unidade(auth.uid(), unidade_id, 'admin'::app_role)
    OR has_role_in_unidade(auth.uid(), unidade_id, 'recepcao'::app_role)
    OR has_role_in_unidade(auth.uid(), unidade_id, 'medico'::app_role)
    OR has_role_in_unidade(auth.uid(), unidade_id, 'enfermeiro'::app_role)
    OR has_role_in_unidade(auth.uid(), unidade_id, 'super_admin'::app_role)
  )
)
WITH CHECK (
  belongs_to_unidade(auth.uid(), unidade_id)
);