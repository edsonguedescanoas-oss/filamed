-- 1. Enum status de assinatura
DO $$ BEGIN
  CREATE TYPE public.assinatura_status AS ENUM ('trial', 'ativo', 'suspenso', 'cancelado');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Colunas em unidades
ALTER TABLE public.unidades
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  ADD COLUMN IF NOT EXISTS status_assinatura public.assinatura_status NOT NULL DEFAULT 'trial';

-- 3. is_super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'::app_role
  )
$$;

-- 4. get_unidade_trial_status
CREATE OR REPLACE FUNCTION public.get_unidade_trial_status(_unidade_id uuid)
RETURNS TABLE(
  status_assinatura public.assinatura_status,
  trial_ends_at timestamptz,
  dias_restantes integer,
  expirado boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    u.status_assinatura,
    u.trial_ends_at,
    GREATEST(0, CEIL(EXTRACT(EPOCH FROM (u.trial_ends_at - now())) / 86400)::integer) AS dias_restantes,
    (u.status_assinatura = 'trial' AND u.trial_ends_at < now())
      OR u.status_assinatura IN ('suspenso','cancelado') AS expirado
  FROM public.unidades u
  WHERE u.id = _unidade_id
  LIMIT 1;
$$;

-- 5. RLS super_admin
DROP POLICY IF EXISTS "super admin lê todas unidades" ON public.unidades;
CREATE POLICY "super admin lê todas unidades"
ON public.unidades FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "super admin atualiza qualquer unidade" ON public.unidades;
CREATE POLICY "super admin atualiza qualquer unidade"
ON public.unidades FOR UPDATE TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "super admin lê todas roles" ON public.user_roles;
CREATE POLICY "super admin lê todas roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "super admin lê todos profiles" ON public.profiles;
CREATE POLICY "super admin lê todos profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));