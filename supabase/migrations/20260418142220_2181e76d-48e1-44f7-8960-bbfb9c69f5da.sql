-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'recepcao', 'medico', 'enfermeiro', 'gestor');
CREATE TYPE public.fila_tipo AS ENUM ('consulta', 'exame', 'enfermagem', 'urgencia', 'farmacia', 'laboratorio', 'outro');
CREATE TYPE public.senha_prioridade AS ENUM ('normal', 'preferencial', 'urgente');
CREATE TYPE public.senha_status AS ENUM ('aguardando', 'chamada', 'em_atendimento', 'finalizada', 'ausente', 'cancelada');
CREATE TYPE public.canal_notificacao AS ENUM ('whatsapp', 'sms', 'telegram', 'push', 'email');
CREATE TYPE public.notificacao_status AS ENUM ('pendente', 'enviada', 'falhou');

-- ============================================================
-- UNIDADES (multi-tenant root)
-- ============================================================
CREATE TABLE public.unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  cnpj TEXT,
  endereco TEXT,
  telefone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PROFILES (1-1 com auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  unidade_id UUID REFERENCES public.unidades(id) ON DELETE SET NULL,
  nome_completo TEXT NOT NULL,
  telefone TEXT,
  avatar_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_unidade ON public.profiles(unidade_id);

-- ============================================================
-- USER_ROLES (separada do profile p/ evitar escalada)
-- ============================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, unidade_id, role)
);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_unidade ON public.user_roles(unidade_id);

-- ============================================================
-- FUNÇÕES SECURITY DEFINER (evitam recursão em RLS)
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.has_role_in_unidade(_user_id UUID, _unidade_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND unidade_id = _unidade_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.user_unidade_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT unidade_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.belongs_to_unidade(_user_id UUID, _unidade_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _user_id AND unidade_id = _unidade_id
  )
$$;

-- ============================================================
-- TRIGGER: cria profile automaticamente no signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome_completo)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TRIGGER: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- FILAS
-- ============================================================
CREATE TABLE public.filas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo public.fila_tipo NOT NULL,
  prefixo_senha TEXT NOT NULL,
  cor TEXT DEFAULT '#3B82F6',
  ativa BOOLEAN NOT NULL DEFAULT TRUE,
  ordem INT NOT NULL DEFAULT 0,
  contador_senha INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (unidade_id, prefixo_senha)
);
CREATE INDEX idx_filas_unidade ON public.filas(unidade_id);

-- ============================================================
-- PACIENTES
-- ============================================================
CREATE TABLE public.pacientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  nome_completo TEXT NOT NULL,
  cpf TEXT,
  data_nascimento DATE,
  telefone TEXT,
  email TEXT,
  prontuario TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pacientes_unidade ON public.pacientes(unidade_id);
CREATE INDEX idx_pacientes_cpf ON public.pacientes(unidade_id, cpf);
CREATE INDEX idx_pacientes_nome ON public.pacientes(unidade_id, nome_completo);

-- ============================================================
-- SENHAS (entrada na fila)
-- ============================================================
CREATE TABLE public.senhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  fila_id UUID NOT NULL REFERENCES public.filas(id) ON DELETE CASCADE,
  paciente_id UUID REFERENCES public.pacientes(id) ON DELETE SET NULL,
  codigo TEXT NOT NULL,
  token_publico UUID NOT NULL DEFAULT gen_random_uuid(),
  prioridade public.senha_prioridade NOT NULL DEFAULT 'normal',
  status public.senha_status NOT NULL DEFAULT 'aguardando',
  posicao INT,
  origem TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalizada_em TIMESTAMPTZ,
  UNIQUE (unidade_id, codigo)
);
CREATE INDEX idx_senhas_unidade_status ON public.senhas(unidade_id, status);
CREATE INDEX idx_senhas_fila_status ON public.senhas(fila_id, status);
CREATE INDEX idx_senhas_token ON public.senhas(token_publico);

-- ============================================================
-- CHAMADAS (registro no painel/TV)
-- ============================================================
CREATE TABLE public.chamadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  senha_id UUID NOT NULL REFERENCES public.senhas(id) ON DELETE CASCADE,
  chamado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  destino TEXT NOT NULL,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chamadas_unidade ON public.chamadas(unidade_id, created_at DESC);
CREATE INDEX idx_chamadas_senha ON public.chamadas(senha_id);

-- ============================================================
-- ATENDIMENTOS
-- ============================================================
CREATE TABLE public.atendimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  senha_id UUID NOT NULL REFERENCES public.senhas(id) ON DELETE CASCADE,
  paciente_id UUID REFERENCES public.pacientes(id) ON DELETE SET NULL,
  profissional_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  iniciado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalizado_em TIMESTAMPTZ,
  duracao_segundos INT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_atendimentos_unidade ON public.atendimentos(unidade_id, iniciado_em DESC);

-- ============================================================
-- SINALIZAÇÃO DIGITAL
-- ============================================================
CREATE TABLE public.sinalizacao_digital (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'imagem',
  url_midia TEXT,
  duracao_segundos INT NOT NULL DEFAULT 10,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  inicio_exibicao TIMESTAMPTZ,
  fim_exibicao TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sinalizacao_unidade ON public.sinalizacao_digital(unidade_id, ativo);

-- ============================================================
-- LOG DE NOTIFICAÇÕES
-- ============================================================
CREATE TABLE public.notificacoes_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  senha_id UUID REFERENCES public.senhas(id) ON DELETE CASCADE,
  canal public.canal_notificacao NOT NULL,
  destinatario TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  status public.notificacao_status NOT NULL DEFAULT 'pendente',
  erro TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  enviada_em TIMESTAMPTZ
);
CREATE INDEX idx_notif_unidade ON public.notificacoes_log(unidade_id, created_at DESC);

-- ============================================================
-- TRIGGERS updated_at
-- ============================================================
CREATE TRIGGER trg_unidades_updated BEFORE UPDATE ON public.unidades FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_filas_updated BEFORE UPDATE ON public.filas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_pacientes_updated BEFORE UPDATE ON public.pacientes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_senhas_updated BEFORE UPDATE ON public.senhas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_sinalizacao_updated BEFORE UPDATE ON public.sinalizacao_digital FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- HABILITAR RLS
-- ============================================================
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.senhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sinalizacao_digital ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLÍTICAS RLS
-- ============================================================

-- UNIDADES: usuário vê a sua; admin pode atualizar
CREATE POLICY "ver minha unidade" ON public.unidades FOR SELECT TO authenticated
  USING (id = public.user_unidade_id(auth.uid()));
CREATE POLICY "admin atualiza unidade" ON public.unidades FOR UPDATE TO authenticated
  USING (public.has_role_in_unidade(auth.uid(), id, 'admin'));

-- PROFILES: usuário lê o próprio + colegas da mesma unidade; só atualiza o próprio
CREATE POLICY "ler profiles da unidade" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR unidade_id = public.user_unidade_id(auth.uid()));
CREATE POLICY "atualizar próprio profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());
CREATE POLICY "admin gerencia profiles da unidade" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role_in_unidade(auth.uid(), unidade_id, 'admin'))
  WITH CHECK (public.has_role_in_unidade(auth.uid(), unidade_id, 'admin'));

-- USER_ROLES: usuário lê os próprios; só admin atribui/remove
CREATE POLICY "ler próprias roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role_in_unidade(auth.uid(), unidade_id, 'admin'));
CREATE POLICY "admin gerencia roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role_in_unidade(auth.uid(), unidade_id, 'admin'))
  WITH CHECK (public.has_role_in_unidade(auth.uid(), unidade_id, 'admin'));

-- FILAS: leitura pela unidade; admin/recepção/gestor escrevem
CREATE POLICY "ler filas da unidade" ON public.filas FOR SELECT TO authenticated
  USING (public.belongs_to_unidade(auth.uid(), unidade_id));
CREATE POLICY "gerenciar filas" ON public.filas FOR ALL TO authenticated
  USING (
    public.has_role_in_unidade(auth.uid(), unidade_id, 'admin')
    OR public.has_role_in_unidade(auth.uid(), unidade_id, 'recepcao')
  )
  WITH CHECK (
    public.has_role_in_unidade(auth.uid(), unidade_id, 'admin')
    OR public.has_role_in_unidade(auth.uid(), unidade_id, 'recepcao')
  );
-- TV/painel público pode listar filas ativas
CREATE POLICY "público lê filas ativas" ON public.filas FOR SELECT TO anon
  USING (ativa = TRUE);

-- PACIENTES: equipe da unidade lê; recepção/admin escrevem
CREATE POLICY "ler pacientes da unidade" ON public.pacientes FOR SELECT TO authenticated
  USING (public.belongs_to_unidade(auth.uid(), unidade_id));
CREATE POLICY "recepcao gerencia pacientes" ON public.pacientes FOR ALL TO authenticated
  USING (
    public.has_role_in_unidade(auth.uid(), unidade_id, 'admin')
    OR public.has_role_in_unidade(auth.uid(), unidade_id, 'recepcao')
  )
  WITH CHECK (
    public.has_role_in_unidade(auth.uid(), unidade_id, 'admin')
    OR public.has_role_in_unidade(auth.uid(), unidade_id, 'recepcao')
  );

-- SENHAS: equipe da unidade vê; recepção/médico/enfermeiro/admin gerenciam
CREATE POLICY "ler senhas da unidade" ON public.senhas FOR SELECT TO authenticated
  USING (public.belongs_to_unidade(auth.uid(), unidade_id));
CREATE POLICY "equipe gerencia senhas" ON public.senhas FOR ALL TO authenticated
  USING (
    public.belongs_to_unidade(auth.uid(), unidade_id) AND (
      public.has_role_in_unidade(auth.uid(), unidade_id, 'admin')
      OR public.has_role_in_unidade(auth.uid(), unidade_id, 'recepcao')
      OR public.has_role_in_unidade(auth.uid(), unidade_id, 'medico')
      OR public.has_role_in_unidade(auth.uid(), unidade_id, 'enfermeiro')
    )
  )
  WITH CHECK (
    public.belongs_to_unidade(auth.uid(), unidade_id)
  );
-- Painel TV (anônimo) lê filas em tempo real
CREATE POLICY "público lê senhas ativas" ON public.senhas FOR SELECT TO anon
  USING (status IN ('aguardando', 'chamada', 'em_atendimento'));

-- CHAMADAS: equipe lê; quem chama é da unidade
CREATE POLICY "ler chamadas da unidade" ON public.chamadas FOR SELECT TO authenticated
  USING (public.belongs_to_unidade(auth.uid(), unidade_id));
CREATE POLICY "equipe registra chamadas" ON public.chamadas FOR INSERT TO authenticated
  WITH CHECK (
    public.belongs_to_unidade(auth.uid(), unidade_id)
    AND chamado_por = auth.uid()
  );
-- Painel TV anônimo lê últimas chamadas
CREATE POLICY "público lê chamadas" ON public.chamadas FOR SELECT TO anon USING (TRUE);

-- ATENDIMENTOS: equipe vê e registra; gestor lê tudo da unidade
CREATE POLICY "ler atendimentos da unidade" ON public.atendimentos FOR SELECT TO authenticated
  USING (public.belongs_to_unidade(auth.uid(), unidade_id));
CREATE POLICY "profissional registra atendimento" ON public.atendimentos FOR INSERT TO authenticated
  WITH CHECK (public.belongs_to_unidade(auth.uid(), unidade_id));
CREATE POLICY "profissional atualiza próprio atendimento" ON public.atendimentos FOR UPDATE TO authenticated
  USING (
    profissional_id = auth.uid()
    OR public.has_role_in_unidade(auth.uid(), unidade_id, 'admin')
  );

-- SINALIZAÇÃO: equipe lê; admin/recepção gerenciam; público (TV) lê ativas
CREATE POLICY "ler sinalizacao da unidade" ON public.sinalizacao_digital FOR SELECT TO authenticated
  USING (public.belongs_to_unidade(auth.uid(), unidade_id));
CREATE POLICY "gerenciar sinalizacao" ON public.sinalizacao_digital FOR ALL TO authenticated
  USING (
    public.has_role_in_unidade(auth.uid(), unidade_id, 'admin')
    OR public.has_role_in_unidade(auth.uid(), unidade_id, 'recepcao')
  )
  WITH CHECK (
    public.has_role_in_unidade(auth.uid(), unidade_id, 'admin')
    OR public.has_role_in_unidade(auth.uid(), unidade_id, 'recepcao')
  );
CREATE POLICY "público lê sinalizacao ativa" ON public.sinalizacao_digital FOR SELECT TO anon
  USING (ativo = TRUE);

-- NOTIFICAÇÕES LOG: equipe da unidade lê; insert via service role (server)
CREATE POLICY "ler log notificacoes" ON public.notificacoes_log FOR SELECT TO authenticated
  USING (public.belongs_to_unidade(auth.uid(), unidade_id));