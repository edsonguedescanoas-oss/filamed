-- Tenta adicionar o valor 'ignorado' ao enum se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid 
        WHERE t.typname = 'notificacao_status' AND e.enumlabel = 'ignorado'
    ) THEN
        ALTER TYPE public.notificacao_status ADD VALUE 'ignorado';
    END IF;
END
$$;

-- Política para super_admin ver todos os logs de notificações
CREATE POLICY "Super admins podem ver todos os logs" 
ON public.notificacoes_log
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);