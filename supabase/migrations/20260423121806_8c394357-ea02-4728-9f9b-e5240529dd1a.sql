DROP POLICY "recepcao gerencia pacientes" ON public.pacientes;

CREATE POLICY "equipe gerencia pacientes"
ON public.pacientes
FOR ALL
USING (
  has_role_in_unidade(auth.uid(), unidade_id, 'admin'::app_role)
  OR has_role_in_unidade(auth.uid(), unidade_id, 'recepcao'::app_role)
  OR has_role_in_unidade(auth.uid(), unidade_id, 'super_admin'::app_role)
)
WITH CHECK (
  has_role_in_unidade(auth.uid(), unidade_id, 'admin'::app_role)
  OR has_role_in_unidade(auth.uid(), unidade_id, 'recepcao'::app_role)
  OR has_role_in_unidade(auth.uid(), unidade_id, 'super_admin'::app_role)
);