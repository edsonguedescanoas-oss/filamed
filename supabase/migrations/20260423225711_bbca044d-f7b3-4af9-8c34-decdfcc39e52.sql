DROP POLICY IF EXISTS "ler profiles da unidade" ON public.profiles;
CREATE POLICY "ler profiles da unidade"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR unidade_id = public.user_unidade_id(auth.uid())
  OR (
    unidade_id IS NOT NULL
    AND public.has_role_in_unidade(auth.uid(), unidade_id, 'gestor'::public.app_role)
  )
);

DROP POLICY IF EXISTS "ler próprias roles" ON public.user_roles;
CREATE POLICY "ler próprias roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role_in_unidade(auth.uid(), unidade_id, 'admin'::public.app_role)
  OR public.has_role_in_unidade(auth.uid(), unidade_id, 'gestor'::public.app_role)
);