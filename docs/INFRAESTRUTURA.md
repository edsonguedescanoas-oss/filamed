# FilaMed — Infraestrutura Base

> Adaptação do prompt `LOVABLE_PROMPT_1_BASE_INFRA.md` para a stack real do projeto: **TanStack Start + Lovable Cloud** (PostgreSQL + Auth + Realtime gerenciados, sem Docker/Express).

---

## 1. Stack provisionado

| Camada | Tecnologia |
|---|---|
| Frontend / SSR | TanStack Start (React 19 + Vite 7) |
| Edge runtime | Cloudflare Workers (via Lovable) |
| Banco de dados | PostgreSQL gerenciado (Lovable Cloud) |
| Autenticação | Lovable Cloud Auth (email + senha, JWT) |
| Realtime | Postgres Changes via WebSocket |
| Storage | Lovable Cloud Storage (para sinalização digital) |
| Server logic | `createServerFn` (TanStack) + Server Routes (`/api/*`) |

Variáveis de ambiente (`.env`) já configuradas automaticamente:

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` — cliente browser
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` — SSR / server functions
- `SUPABASE_SERVICE_ROLE_KEY` — admin (server-only, bypassa RLS)

---

## 2. Modelo de dados

### Multi-tenant
Toda tabela operacional carrega `unidade_id`. RLS isola dados entre clínicas.

```
unidades ─┬─ profiles (1-1 com auth.users)
          ├─ user_roles (admin | recepcao | medico | enfermeiro | gestor)
          ├─ filas ─── senhas ─┬─ chamadas
          │                    ├─ atendimentos
          │                    └─ notificacoes_log
          ├─ pacientes ────────┘
          └─ sinalizacao_digital
```

### Tabelas

| Tabela | Função |
|---|---|
| `unidades` | Clínicas / hospitais cadastrados |
| `profiles` | Dados do operador (nome, telefone, unidade_id) |
| `user_roles` | Vínculo usuário ↔ papel ↔ unidade |
| `filas` | Filas por unidade (ex: CONS, EXM, URG…) |
| `pacientes` | Cadastro de pacientes (sem login) |
| `senhas` | Senha alfanumérica gerada (status, prioridade, token público) |
| `chamadas` | Histórico de chamadas no painel/TV |
| `atendimentos` | Registro do atendimento iniciado/finalizado |
| `sinalizacao_digital` | Conteúdos exibidos durante a espera |
| `notificacoes_log` | Log de envios WhatsApp / SMS / Telegram |

### Enums

- `app_role`: admin · recepcao · medico · enfermeiro · gestor
- `fila_tipo`: consulta · exame · enfermagem · urgencia · farmacia · laboratorio · outro
- `senha_prioridade`: normal · preferencial · urgente
- `senha_status`: aguardando · chamada · em_atendimento · finalizada · ausente · cancelada
- `canal_notificacao`: whatsapp · sms · telegram · push · email

---

## 3. Segurança (RLS)

### Funções `SECURITY DEFINER` (evitam recursão em policies)

- `has_role(user, role)` → boolean
- `has_role_in_unidade(user, unidade, role)` → boolean
- `user_unidade_id(user)` → uuid
- `belongs_to_unidade(user, unidade)` → boolean

### Resumo de permissões

| Tabela | Ler | Escrever |
|---|---|---|
| `unidades` | Membros da unidade + público (TV) | Admin |
| `profiles` | Colegas da mesma unidade | O próprio usuário ou admin |
| `user_roles` | O próprio usuário ou admin | Admin |
| `filas` | Equipe + público (anon) | Admin / Recepção |
| `pacientes` | Equipe da unidade | Admin / Recepção |
| `senhas` | Equipe + público (status ativo) | Admin / Recepção / Médico / Enfermeiro |
| `chamadas` | Equipe + público | Equipe (chamado_por = self) |
| `atendimentos` | Equipe da unidade | Equipe; update apenas pelo profissional ou admin |
| `sinalizacao_digital` | Equipe + público (TV) | Admin / Recepção |
| `notificacoes_log` | Equipe da unidade | Server (service role) |

### Acesso público controlado

- Painel de TV e WebApp do paciente são páginas **anônimas** que leem apenas:
  - filas ativas
  - senhas com status `aguardando | chamada | em_atendimento`
  - sinalização ativa
  - chamadas recentes
- Paciente acompanha sua própria senha pelo `token_publico` (UUID) — sem necessidade de login.

---

## 4. Triggers

- `on_auth_user_created` → cria `profiles` automaticamente no signup, usando `raw_user_meta_data->>'nome_completo'`.
- `trg_*_updated` → atualiza `updated_at` em todas as tabelas mutáveis.

---

## 5. Próximos prompts

Esta migration cobre **apenas a infra**. Próximas etapas sugeridas:

1. **Auth UI** — página `/login` e `/setup` (cria primeira unidade + admin).
2. **Dashboard operacional** — recepção gerando senhas, fila ao vivo.
3. **Painel TV** (`/tv/:slug`) — público, full-screen, com Realtime.
4. **WebApp paciente** (`/fila/:token`) — acompanha posição.
5. **Server routes `/api/*`** — webhooks de notificação (WhatsApp/SMS).
6. **Analytics** — views materializadas para tempo médio de espera, throughput, picos.

---

**Status:** Banco provisionado, RLS ativo, pronto para construção das telas.
