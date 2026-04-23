-- Função: lista todas as faturas de uma unidade (apenas super_admin)
CREATE OR REPLACE FUNCTION public.admin_listar_faturas_unidade(_unidade_id uuid)
RETURNS TABLE(
  id uuid,
  numero text,
  linha_descricao text,
  valor_centavos integer,
  moeda text,
  status fatura_status,
  vencimento date,
  paga_em timestamp with time zone,
  url_recibo text,
  metodo_pagamento text,
  gateway_invoice_id text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas super admins podem acessar faturas';
  END IF;

  RETURN QUERY
  SELECT
    f.id, f.numero, f.linha_descricao, f.valor_centavos, f.moeda, f.status,
    f.vencimento, f.paga_em, f.url_recibo, f.metodo_pagamento,
    f.gateway_invoice_id, f.created_at
  FROM public.faturas f
  WHERE f.unidade_id = _unidade_id
  ORDER BY f.created_at DESC
  LIMIT 100;
END;
$$;

-- Função: detalhe da assinatura atual da unidade (apenas super_admin)
CREATE OR REPLACE FUNCTION public.admin_detalhe_assinatura(_unidade_id uuid)
RETURNS TABLE(
  assinatura_id uuid,
  plano_id uuid,
  plano_nome text,
  plano_slug text,
  ciclo assinatura_ciclo,
  status assinatura_estado,
  inicio_em timestamp with time zone,
  proximo_ciclo_em timestamp with time zone,
  cancelada_em timestamp with time zone,
  cancelar_no_fim_do_ciclo boolean,
  gateway text,
  gateway_subscription_id text,
  gateway_customer_id text,
  metadata jsonb,
  preco_mensal_centavos integer,
  preco_anual_centavos integer,
  moeda text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas super admins podem acessar dados de assinatura';
  END IF;

  RETURN QUERY
  SELECT
    a.id, p.id, p.nome, p.slug, a.ciclo, a.status,
    a.inicio_em, a.proximo_ciclo_em, a.cancelada_em, a.cancelar_no_fim_do_ciclo,
    a.gateway, a.gateway_subscription_id, a.gateway_customer_id, a.metadata,
    p.preco_mensal_centavos, p.preco_anual_centavos, p.moeda
  FROM public.assinaturas a
  JOIN public.planos p ON p.id = a.plano_id
  WHERE a.unidade_id = _unidade_id
  LIMIT 1;
END;
$$;

-- Função: altera plano e/ou ciclo de uma assinatura (apenas super_admin)
-- Cria assinatura nova caso a unidade não tenha
CREATE OR REPLACE FUNCTION public.admin_alterar_plano_assinatura(
  _unidade_id uuid,
  _plano_id uuid,
  _ciclo assinatura_ciclo DEFAULT 'mensal',
  _novo_status assinatura_estado DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _existing_id UUID;
  _new_id UUID;
BEGIN
  IF NOT public.is_super_admin(_user_id) THEN
    RAISE EXCEPTION 'Apenas super admins podem alterar planos';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.planos WHERE id = _plano_id AND ativo = true) THEN
    RAISE EXCEPTION 'Plano inválido ou inativo';
  END IF;

  SELECT id INTO _existing_id
  FROM public.assinaturas
  WHERE unidade_id = _unidade_id
  LIMIT 1;

  IF _existing_id IS NOT NULL THEN
    UPDATE public.assinaturas
    SET 
      plano_id = _plano_id,
      ciclo = _ciclo,
      status = COALESCE(_novo_status, status),
      updated_at = now()
    WHERE id = _existing_id;
    _new_id := _existing_id;
  ELSE
    INSERT INTO public.assinaturas (unidade_id, plano_id, ciclo, status, gateway)
    VALUES (
      _unidade_id, _plano_id, _ciclo,
      COALESCE(_novo_status, 'ativa'::assinatura_estado),
      'manual'
    )
    RETURNING id INTO _new_id;

    UPDATE public.unidades
    SET assinatura_id = _new_id, status_assinatura = 'ativo'::assinatura_status
    WHERE id = _unidade_id;
  END IF;

  RETURN _new_id;
END;
$$;

-- Função: cancela assinatura (apenas super_admin)
CREATE OR REPLACE FUNCTION public.admin_cancelar_assinatura(
  _unidade_id uuid,
  _imediato boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id UUID := auth.uid();
BEGIN
  IF NOT public.is_super_admin(_user_id) THEN
    RAISE EXCEPTION 'Apenas super admins podem cancelar assinaturas';
  END IF;

  IF _imediato THEN
    UPDATE public.assinaturas
    SET 
      status = 'cancelada'::assinatura_estado,
      cancelada_em = now(),
      cancelar_no_fim_do_ciclo = false,
      updated_at = now()
    WHERE unidade_id = _unidade_id;

    UPDATE public.unidades
    SET status_assinatura = 'cancelado'::assinatura_status
    WHERE id = _unidade_id;
  ELSE
    UPDATE public.assinaturas
    SET 
      cancelar_no_fim_do_ciclo = true,
      updated_at = now()
    WHERE unidade_id = _unidade_id;
  END IF;
END;
$$;

-- Função: marca uma fatura manualmente como paga (apenas super_admin)
CREATE OR REPLACE FUNCTION public.admin_marcar_fatura_paga(
  _fatura_id uuid,
  _metodo text DEFAULT 'manual'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id UUID := auth.uid();
BEGIN
  IF NOT public.is_super_admin(_user_id) THEN
    RAISE EXCEPTION 'Apenas super admins podem alterar faturas';
  END IF;

  UPDATE public.faturas
  SET 
    status = 'paga'::fatura_status,
    paga_em = now(),
    metodo_pagamento = _metodo,
    updated_at = now()
  WHERE id = _fatura_id;
END;
$$;