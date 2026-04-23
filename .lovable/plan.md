

# Fluxo Pré-Atendimento → Guichê → Atendimento → Retorno (revisado)

## Visão geral

```text
[Pré-atendimento: nome+tel+nasc] → [Senha GERAL G001]
  → [Atendente do Guichê 02 chama "G001 → Guichê 02"]
  → [Classifica: especialidade + tipo]
  → [Senha clínica: ex. C015 → "Consultório 001"]
  → [Atendimento; ao finalizar: requer retorno?]
      sim → nova senha no Guichê | não → fim
```

Cada **atendente** tem o seu **ponto de chamada** (Guichê 01, Consultório 001, Ultrassom 001 etc.) cadastrado no sistema. Ao chamar, a TV mostra o destino exato do atendente logado — paciente sabe para onde ir.

## Conceito novo: Pontos de Atendimento

Tabela nova `pontos_atendimento` por unidade — é a "estação" que um atendente ocupa.
- `nome` (ex.: "Guichê 02", "Consultório 001", "Ultrassom 001")
- `tipo` (`guiche`, `consultorio`, `exame`, `outro`) — só para agrupar/filtrar
- `fila_id` (FK opcional) — qual fila este ponto **atende** (ex.: Consultório 001 atende fila "Clínica Geral"; Guichê 02 atende fila "Guichê")
- `ativo` (boolean)

Cada usuário (profile) escolhe ao iniciar o turno **qual ponto está ocupando** (ex.: "Hoje sou o Guichê 02"). Essa escolha:
- fica salva em `profiles.ponto_atendimento_id` (nova coluna nullable)
- aparece num seletor no header do app, trocável a qualquer momento
- determina o `destino` automaticamente em toda chamada que ele fizer

Admin cadastra os pontos em nova tela `/app/pontos`. CRUD simples (nome, tipo, fila vinculada, ativo).

## O que muda na prática

### 1. Pré-atendimento (`/app/recepcao` simplificada)
Form com **3 campos**: nome, telefone, data de nascimento.
Botão "Gerar senha do guichê" → cria/atualiza paciente, gera senha na fila Guichê (prefixo `G`), com opção de impressão.

### 2. Guichê (`/app/guiche`)
- Topo da tela: **seletor "Você está em: [Guichê 01 ▾]"** (lista os pontos do tipo `guiche` ativos)
- Lista de senhas aguardando na fila Guichê
- Botão "Chamar próxima" → chamada usa o `destino` = nome do ponto do atendente logado (ex.: "Guichê 02"). TV anuncia "G001 → Guichê 02"
- Painel do paciente chamado: dados básicos + busca por agendamento prévio + form de classificação (especialidade/fila destino + tipo: agendado/avulso/retorno + observações)
- Ao concluir: gera senha clínica na fila escolhida e libera o atendente para chamar a próxima

### 3. Atendimento (`/app/atendimento`)
- Topo: mesmo seletor "Você está em: [Consultório 001 ▾]" (lista pontos do tipo `consultorio`/`exame`/`outro` ativos)
- Lista de senhas das filas que o ponto selecionado atende (ou todas, se não houver vínculo)
- "Chamar próxima" → TV anuncia "C015 → Consultório 001"
- Dialog de finalização ganha switch **"Requer retorno ao guichê?"**
  - sim → finaliza + gera nova senha na fila Guichê marcada como "Retorno pós-consulta"
  - não → finaliza normal

### 4. TV
Sem mudanças estruturais — o campo `chamadas.destino` já existe e é exibido. Só passa a vir preenchido com o nome real do ponto (Guichê 02, Consultório 001) em vez de texto genérico.

## Mudanças no banco (Lovable Cloud)

1. **Enum `fila_tipo`**: adicionar valor `guiche`.
2. **Seed + trigger**: cria fila "Guichê" (prefixo `G`, tipo `guiche`) automaticamente em cada unidade existente e nas futuras.
3. **Tabela nova `pontos_atendimento`**: `id`, `unidade_id`, `nome`, `tipo` (enum novo `ponto_tipo`: `guiche`/`consultorio`/`exame`/`outro`), `fila_id` (FK opcional), `ativo`, `created_at`. RLS: leitura por unidade, gestão por admin.
4. **Tabela `profiles`**: nova coluna `ponto_atendimento_id uuid` nullable (FK para `pontos_atendimento`).
5. **Tabela `senhas`**: nova coluna `senha_origem_id uuid` (FK para `senhas.id`) — encadeia senha do guichê → senha clínica → senha de retorno.
6. **Tabela `atendimentos`**: novas colunas `requer_retorno boolean default false` e `senha_retorno_id uuid`.
7. **Tabela nova `guiche_atendimentos`**: `senha_id`, `ponto_atendimento_id`, `fila_destino_id`, `tipo` (agendado/avulso/retorno), `observacoes`, `atendido_por`, `created_at`. **Sem campos financeiros.**
8. **RPCs novos**:
   - `gerar_senha_guiche(_unidade_id, _nome, _telefone, _data_nascimento)` — cria/atualiza paciente e senha na fila Guichê.
   - `chamar_senha_do_ponto(_senha_id, _ponto_atendimento_id)` — registra chamada com `destino` = nome do ponto.
   - `encaminhar_do_guiche(_senha_guiche_id, _fila_destino_id, _tipo, _observacoes)` — fecha senha do guichê, registra `guiche_atendimentos`, gera nova senha clínica.
   - `finalizar_atendimento_com_retorno(_atendimento_id, _observacoes, _requer_retorno boolean)` — finaliza e, se `true`, gera senha no guichê.

Tudo com RLS por unidade.

## Permissões (`src/lib/permissions.ts`)

| Role | Telas |
|---|---|
| recepcao | `/app/recepcao` (pré-atendimento) + `/app/guiche` |
| medico/enfermeiro | `/app/atendimento` |
| admin/gestor | tudo + `/app/pontos` (cadastro de pontos) |

Sem novo role.

## Telas a criar/alterar

| Arquivo | Ação |
|---|---|
| `src/routes/_app.app.recepcao.tsx` | Simplificar para 3 campos + gerar senha Guichê |
| `src/routes/_app.app.guiche.tsx` | **Criar**: seletor de ponto + fila + encaminhamento |
| `src/routes/_app.app.atendimento.tsx` | Adicionar seletor de ponto no topo + switch "requer retorno" no finalizar |
| `src/routes/_app.app.pontos.tsx` | **Criar**: CRUD de pontos de atendimento (admin) |
| `src/components/ponto-atendimento-selector.tsx` | **Criar**: dropdown reutilizável que persiste em `profiles.ponto_atendimento_id` |
| `src/lib/permissions.ts` | Liberar `/app/guiche` para `recepcao` e `/app/pontos` para `admin` |
| Migration SQL | Enum, colunas, tabelas novas, 4 RPCs, seed da fila Guichê, trigger de auto-criação |

## Fora deste escopo
- Pagamento, recibo e nota fiscal (sistema organizacional próprio da clínica)
- Triagem com sinais vitais
- Prontuário eletrônico estruturado
- Agenda/agendamento online com WhatsApp
- Convênios / TUSS
- NPS

