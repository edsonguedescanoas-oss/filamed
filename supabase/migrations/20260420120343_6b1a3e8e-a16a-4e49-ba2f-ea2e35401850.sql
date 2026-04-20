-- =========================================
-- 1. ENUMS
-- =========================================
DO $$ BEGIN
  CREATE TYPE public.assinatura_estado AS ENUM ('trialing','ativa','inadimplente','cancelada','pausada');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.assinatura_ciclo AS ENUM ('mensal','anual');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.fatura_status AS ENUM ('aberta','paga','falhou','reembolsada','cancelada');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =========================================
-- 2. TABELA: planos
-- =========================================
CREATE TABLE IF NOT EXISTS public.planos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  preco_mensal_centavos integer NOT NULL CHECK (preco_mensal_centavos >= 0),
  preco_anual_centavos integer CHECK (preco_anual_centavos IS NULL OR preco_anual_centavos >= 0),
  moeda text NOT NULL DEFAULT 'BRL',
  limite_filas integer,
  limite_atendentes integer,
  limite_tvs integer,
  limite_senhas_mes integer,
  recursos jsonb NOT NULL DEFAULT '{}'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  destaque boolean NOT NULL DEFAULT false,
  ordem integer NOT NULL DEFAULT 0,
  gateway_price_id_mensal text,
  gateway_price_id_anual text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planos_ativo_ordem ON public.planos(ativo, ordem);

-- =========================================
-- 3. TABELA: assinaturas
-- =========================================
CREATE TABLE IF NOT EXISTS public.assinaturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id uuid NOT NULL UNIQUE REFERENCES public.unidades(id) ON DELETE CASCADE,
  plano_id uuid NOT NULL REFERENCES public.planos(id) ON DELETE RESTRICT,
  status public.assinatura_estado NOT NULL DEFAULT 'trialing',
  ciclo public.assinatura_ciclo NOT NULL DEFAULT 'mensal',
  inicio_em timestamptz NOT NULL DEFAULT now(),
  proximo_ciclo_em timestamptz,
  cancelada_em timestamptz,
  cancelar_no_fim_do_ciclo boolean NOT NULL DEFAULT false,
  gateway text,
  gateway_subscription_id text,
  gateway_customer_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assinaturas_status ON public.assinaturas(status);
CREATE INDEX IF NOT EXISTS idx_assinaturas_plano ON public.assinaturas(plano_id);

-- =========================================
-- 4. TABELA: faturas
-- =========================================
CREATE TABLE IF NOT EXISTS public.faturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id uuid NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  assinatura_id uuid NOT NULL REFERENCES public.assinaturas(id) ON DELETE CASCADE,
  numero text NOT NULL UNIQUE,
  valor_centavos integer NOT NULL CHECK (valor_centavos >= 0),
  moeda text NOT NULL DEFAULT 'BRL',
  status public.fatura_status NOT NULL DEFAULT 'aberta',
  vencimento date NOT NULL,
  paga_em timestamptz,
  metodo_pagamento text,
  gateway_invoice_id text,
  gateway_payment_id text,
  url_recibo text,
  linha_descricao text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_faturas_unidade ON public.faturas(unidade_id);
CREATE INDEX IF NOT EXISTS idx_faturas_assinatura ON public.faturas(assinatura_id);
CREATE INDEX IF NOT EXISTS idx_faturas_status ON public.faturas(status);
CREATE INDEX IF NOT EXISTS idx_faturas_vencimento ON public.faturas(vencimento);

-- =========================================
-- 5. unidades.assinatura_id (atalho)
-- =========================================
ALTER TABLE public.unidades
  ADD COLUMN IF NOT EXISTS assinatura_id uuid REFERENCES public.assinaturas(id) ON DELETE SET NULL;

-- =========================================
-- 6. Triggers updated_at
-- =========================================
DROP TRIGGER IF EXISTS trg_planos_updated ON public.planos;
CREATE TRIGGER trg_planos_updated BEFORE UPDATE ON public.planos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_assinaturas_updated ON public.assinaturas;
CREATE TRIGGER trg_assinaturas_updated BEFORE UPDATE ON public.assinaturas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_faturas_updated ON public.faturas;
CREATE TRIGGER trg_faturas_updated BEFORE UPDATE ON public.faturas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================
-- 7. RLS
-- =========================================
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faturas ENABLE ROW LEVEL SECURITY;

-- ---- PLANOS ----
DROP POLICY IF EXISTS "público lê planos ativos" ON public.planos;
CREATE POLICY "público lê planos ativos"
ON public.planos FOR SELECT TO anon, authenticated
USING (ativo = true);

DROP POLICY IF EXISTS "super admin lê todos planos" ON public.planos;
CREATE POLICY "super admin lê todos planos"
ON public.planos FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "super admin gerencia planos" ON public.planos;
CREATE POLICY "super admin gerencia planos"
ON public.planos FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- ---- ASSINATURAS ----
DROP POLICY IF EXISTS "admin lê assinatura da unidade" ON public.assinaturas;
CREATE POLICY "admin lê assinatura da unidade"
ON public.assinaturas FOR SELECT TO authenticated
USING (public.has_role_in_unidade(auth.uid(), unidade_id, 'admin'::app_role));

DROP POLICY IF EXISTS "super admin lê todas assinaturas" ON public.assinaturas;
CREATE POLICY "super admin lê todas assinaturas"
ON public.assinaturas FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "super admin gerencia assinaturas" ON public.assinaturas;
CREATE POLICY "super admin gerencia assinaturas"
ON public.assinaturas FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- ---- FATURAS ----
DROP POLICY IF EXISTS "admin lê faturas da unidade" ON public.faturas;
CREATE POLICY "admin lê faturas da unidade"
ON public.faturas FOR SELECT TO authenticated
USING (public.has_role_in_unidade(auth.uid(), unidade_id, 'admin'::app_role));

DROP POLICY IF EXISTS "super admin lê todas faturas" ON public.faturas;
CREATE POLICY "super admin lê todas faturas"
ON public.faturas FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "super admin gerencia faturas" ON public.faturas;
CREATE POLICY "super admin gerencia faturas"
ON public.faturas FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- =========================================
-- 8. FUNÇÕES AUXILIARES
-- =========================================
CREATE OR REPLACE FUNCTION public.get_plano_atual(_unidade_id uuid)
RETURNS TABLE(
  assinatura_id uuid,
  plano_id uuid,
  plano_slug text,
  plano_nome text,
  status public.assinatura_estado,
  ciclo public.assinatura_ciclo,
  proximo_ciclo_em timestamptz,
  recursos jsonb,
  limite_filas integer,
  limite_atendentes integer,
  limite_tvs integer,
  limite_senhas_mes integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    a.id, p.id, p.slug, p.nome, a.status, a.ciclo, a.proximo_ciclo_em,
    p.recursos, p.limite_filas, p.limite_atendentes, p.limite_tvs, p.limite_senhas_mes
  FROM public.assinaturas a
  JOIN public.planos p ON p.id = a.plano_id
  WHERE a.unidade_id = _unidade_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.tem_recurso(_unidade_id uuid, _recurso text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT (p.recursos ->> _recurso)::boolean
     FROM public.assinaturas a
     JOIN public.planos p ON p.id = a.plano_id
     WHERE a.unidade_id = _unidade_id
       AND a.status IN ('ativa','trialing')
     LIMIT 1),
    false
  );
$$;

-- =========================================
-- 9. SEED inicial: 3 planos
-- =========================================
INSERT INTO public.planos
  (slug, nome, descricao, preco_mensal_centavos, preco_anual_centavos,
   limite_filas, limite_atendentes, limite_tvs, limite_senhas_mes,
   recursos, destaque, ordem)
VALUES
  ('starter', 'Starter',
   'Ideal para clínicas pequenas começando a organizar a recepção.',
   9900, 99000,
   2, 3, 1, 2000,
   '{"whatsapp": false, "voz_premium": false, "relatorios_avancados": false, "suporte_prioritario": false}'::jsonb,
   false, 1),
  ('pro', 'Pro',
   'Para clínicas em crescimento que precisam de mais filas, voz natural e WhatsApp.',
   24900, 249000,
   10, 15, 5, 20000,
   '{"whatsapp": true, "voz_premium": true, "relatorios_avancados": true, "suporte_prioritario": false}'::jsonb,
   true, 2),
  ('enterprise', 'Enterprise',
   'Para redes e clínicas de grande porte. Sem limites e suporte dedicado.',
   59900, 599000,
   NULL, NULL, NULL, NULL,
   '{"whatsapp": true, "voz_premium": true, "relatorios_avancados": true, "suporte_prioritario": true, "sso": true, "api": true}'::jsonb,
   false, 3)
ON CONFLICT (slug) DO NOTHING;