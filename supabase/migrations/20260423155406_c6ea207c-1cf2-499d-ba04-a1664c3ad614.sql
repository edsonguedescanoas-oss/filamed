-- Permite super_admin inserir unidades
CREATE POLICY "super admin cria unidades"
ON public.unidades
FOR INSERT
TO authenticated
WITH CHECK (is_super_admin(auth.uid()));

-- Função: criar nova unidade (apenas super_admin)
CREATE OR REPLACE FUNCTION public.admin_criar_unidade(
  _nome TEXT,
  _slug TEXT DEFAULT NULL,
  _cnpj TEXT DEFAULT NULL,
  _endereco TEXT DEFAULT NULL,
  _telefone TEXT DEFAULT NULL,
  _trial_dias INT DEFAULT 14
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _new_unidade_id UUID;
  _final_slug TEXT;
BEGIN
  IF NOT public.is_super_admin(_user_id) THEN
    RAISE EXCEPTION 'Apenas super admins podem criar unidades';
  END IF;

  _final_slug := COALESCE(
    NULLIF(trim(_slug), ''),
    lower(regexp_replace(unaccent_simple(_nome), '[^a-zA-Z0-9]+', '-', 'g'))
  );
  IF EXISTS (SELECT 1 FROM public.unidades WHERE slug = _final_slug) THEN
    _final_slug := _final_slug || '-' || substr(gen_random_uuid()::text, 1, 6);
  END IF;

  INSERT INTO public.unidades (
    nome, slug, cnpj, endereco, telefone, 
    trial_ends_at, status_assinatura, ativo
  )
  VALUES (
    trim(_nome), _final_slug, _cnpj, _endereco, _telefone,
    now() + (_trial_dias || ' days')::interval,
    'trial'::assinatura_status, true
  )
  RETURNING id INTO _new_unidade_id;

  RETURN _new_unidade_id;
END;
$$;

-- Função: alterar status (suspender/ativar/cancelar)
CREATE OR REPLACE FUNCTION public.admin_atualizar_status_unidade(
  _unidade_id UUID,
  _novo_status assinatura_status,
  _ativo BOOLEAN DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
BEGIN
  IF NOT public.is_super_admin(_user_id) THEN
    RAISE EXCEPTION 'Apenas super admins podem alterar status de unidades';
  END IF;

  UPDATE public.unidades
  SET 
    status_assinatura = _novo_status,
    ativo = COALESCE(_ativo, ativo),
    updated_at = now()
  WHERE id = _unidade_id;
END;
$$;

-- Função: stats de integração da unidade
CREATE OR REPLACE FUNCTION public.admin_unidade_integracao_status(_unidade_id UUID)
RETURNS TABLE (
  tem_assinatura BOOLEAN,
  plano_nome TEXT,
  status_assinatura TEXT,
  whatsapp_configurado BOOLEAN,
  voz_configurada BOOLEAN,
  tv_configurada BOOLEAN,
  total_filas BIGINT,
  total_usuarios BIGINT,
  total_pacientes BIGINT,
  total_senhas_30d BIGINT,
  total_notificacoes_30d BIGINT,
  notificacoes_falhas_30d BIGINT,
  faturas_pendentes BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
BEGIN
  IF NOT public.is_super_admin(_user_id) THEN
    RAISE EXCEPTION 'Apenas super admins podem acessar estes dados';
  END IF;

  RETURN QUERY
  SELECT
    EXISTS(SELECT 1 FROM assinaturas a WHERE a.unidade_id = _unidade_id),
    (SELECT p.nome FROM assinaturas a JOIN planos p ON p.id = a.plano_id WHERE a.unidade_id = _unidade_id LIMIT 1),
    (SELECT a.status::text FROM assinaturas a WHERE a.unidade_id = _unidade_id LIMIT 1),
    EXISTS(SELECT 1 FROM unidades u WHERE u.id = _unidade_id AND u.whatsapp_config IS NOT NULL AND u.whatsapp_config <> '{}'::jsonb),
    EXISTS(SELECT 1 FROM unidade_voice_config v WHERE v.unidade_id = _unidade_id),
    EXISTS(SELECT 1 FROM tv_visual_config t WHERE t.unidade_id = _unidade_id),
    (SELECT COUNT(*) FROM filas f WHERE f.unidade_id = _unidade_id),
    (SELECT COUNT(*) FROM profiles p WHERE p.unidade_id = _unidade_id),
    (SELECT COUNT(*) FROM pacientes pa WHERE pa.unidade_id = _unidade_id),
    (SELECT COUNT(*) FROM senhas s WHERE s.unidade_id = _unidade_id AND s.created_at > now() - interval '30 days'),
    (SELECT COUNT(*) FROM notificacoes_log n WHERE n.unidade_id = _unidade_id AND n.created_at > now() - interval '30 days'),
    (SELECT COUNT(*) FROM notificacoes_log n WHERE n.unidade_id = _unidade_id AND n.created_at > now() - interval '30 days' AND n.status = 'falhou'),
    (SELECT COUNT(*) FROM faturas f WHERE f.unidade_id = _unidade_id AND f.status IN ('aberta','falhou'));
END;
$$;