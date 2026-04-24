import { Activity, BarChart3, ClipboardCheck, Settings, Stethoscope, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ManualRole = "admin" | "gestor" | "atendente" | "clinico";

export interface ManualSection {
  id: string;
  role: ManualRole;
  title: string;
  summary: string;
  duration: string;
  videoTitle: string;
  videoDescription: string;
  steps: string[];
  checklist: string[];
  examples: string[];
  keywords: string[];
}

export interface ManualRoleMeta {
  id: ManualRole;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const manualRoles: ManualRoleMeta[] = [
  {
    id: "admin",
    label: "Admin",
    description: "Configuração inicial, planos, canais, permissões e auditoria.",
    icon: Settings,
  },
  {
    id: "gestor",
    label: "Gestor",
    description: "Rotina operacional, relatórios, indicadores e acompanhamento da unidade.",
    icon: BarChart3,
  },
  {
    id: "atendente",
    label: "Atendente",
    description: "Recepção, guichê, emissão de senhas e encaminhamento de pacientes.",
    icon: ClipboardCheck,
  },
  {
    id: "clinico",
    label: "Médico/Enfermeiro",
    description: "Chamada para atendimento, finalização e retorno do paciente.",
    icon: Stethoscope,
  },
];

export const manualSections: ManualSection[] = [
  {
    id: "admin-configuracao-unidade",
    role: "admin",
    title: "1. Configurar a unidade",
    summary: "Defina nome público, dados de contato, endereço, rodapé do comprovante e identidade exibida nos painéis.",
    duration: "6 min",
    videoTitle: "Primeiro acesso e dados da clínica",
    videoDescription: "Aula curta para deixar a unidade pronta para operar antes de cadastrar filas e usuários.",
    steps: [
      "Acesse Conta e revise os dados gerais da unidade.",
      "Preencha telefone, endereço, CNPJ quando aplicável e nome público.",
      "Configure informações que aparecem no ticket e na TV.",
      "Salve e valide se o checklist inicial marcou a etapa como concluída.",
    ],
    checklist: ["Dados de contato salvos", "Endereço revisado", "Comprovante personalizado", "Checklist atualizado"],
    examples: ["Clínica Matriz usa nome público diferente da razão social no ticket."],
    keywords: ["unidade", "conta", "ticket", "comprovante", "dados gerais"],
  },
  {
    id: "admin-filas-canais",
    role: "admin",
    title: "2. Criar filas e canais",
    summary: "Organize fluxos como recepção, consulta, exames e prioridade; depois conecte notificações.",
    duration: "8 min",
    videoTitle: "Filas, WhatsApp e TV em poucos passos",
    videoDescription: "Mostra como criar filas úteis e testar notificação de ponta a ponta.",
    steps: [
      "Crie filas com prefixos curtos e fáceis de reconhecer.",
      "Cadastre pontos de atendimento para guichês e consultórios.",
      "Configure WhatsApp e mensagem final com link de avaliação.",
      "Gere uma senha de teste e confirme se a chamada aparece na TV.",
    ],
    checklist: ["Fila principal criada", "Ponto de atendimento ativo", "Canal configurado", "Teste de senha executado"],
    examples: ["REC para recepção, CON para consulta e EXA para exames."],
    keywords: ["filas", "whatsapp", "notificação", "tv", "pontos"],
  },
  {
    id: "admin-permissoes",
    role: "admin",
    title: "3. Revisar usuários e permissões",
    summary: "Use a matriz de permissões para liberar apenas as telas necessárias para cada perfil.",
    duration: "5 min",
    videoTitle: "Matriz de permissões sem risco operacional",
    videoDescription: "Explica diferenças entre admin, gestor, recepção, médico e enfermagem.",
    steps: [
      "Acesse Usuários e confira perfis ativos.",
      "Atribua função de acordo com a rotina de trabalho.",
      "Revise o acesso por tela antes de liberar o colaborador.",
      "Remova permissões de usuários inativos imediatamente.",
    ],
    checklist: ["Usuários revisados", "Funções atribuídas", "Acessos testados", "Inativos bloqueados"],
    examples: ["Atendente acessa recepção e guichê, mas não auditoria ou planos."],
    keywords: ["usuários", "permissões", "matriz", "admin", "gestor"],
  },
  {
    id: "gestor-operacao-diaria",
    role: "gestor",
    title: "1. Acompanhar operação diária",
    summary: "Monitore filas, pontos ocupados, senhas em atendimento e gargalos durante o turno.",
    duration: "7 min",
    videoTitle: "Leitura rápida do painel operacional",
    videoDescription: "Treinamento para detectar filas críticas e agir antes da espera aumentar.",
    steps: [
      "Abra o dashboard no início do turno.",
      "Confira volume de senhas por status e fila.",
      "Identifique pontos sem atendimento ou com fila acumulada.",
      "Realinhe equipe e filas quando houver gargalo.",
    ],
    checklist: ["Dashboard conferido", "Filas críticas mapeadas", "Equipe redistribuída", "Pendências registradas"],
    examples: ["Se exames acumulam, o gestor desloca um atendente para triagem rápida."],
    keywords: ["dashboard", "gestão", "fila", "gargalo", "indicadores"],
  },
  {
    id: "gestor-relatorios-auditoria",
    role: "gestor",
    title: "2. Relatórios e auditoria",
    summary: "Analise tempos de espera, produtividade, ausências e eventos importantes da unidade.",
    duration: "6 min",
    videoTitle: "Indicadores para reunião de rotina",
    videoDescription: "Como transformar relatórios em decisões semanais de operação.",
    steps: [
      "Acesse Relatórios e selecione período de análise.",
      "Compare filas com maior volume e maior espera.",
      "Use Auditoria para investigar alterações e eventos sensíveis.",
      "Documente ações de melhoria para a próxima semana.",
    ],
    checklist: ["Período filtrado", "Indicadores revisados", "Auditoria consultada", "Plano de ação definido"],
    examples: ["Relatório mostra pico às 8h; gestor antecipa escala da recepção."],
    keywords: ["relatórios", "auditoria", "produtividade", "tempo de espera", "gestor"],
  },
  {
    id: "atendente-recepcao",
    role: "atendente",
    title: "1. Emitir e organizar senhas",
    summary: "Cadastre paciente quando necessário, gere senha normal ou preferencial e acompanhe posição na fila.",
    duration: "5 min",
    videoTitle: "Recepção sem retrabalho",
    videoDescription: "Fluxo básico para receber o paciente e entregar uma senha correta.",
    steps: [
      "Acesse Recepção e selecione a fila adequada.",
      "Informe dados do paciente quando a rotina exigir identificação.",
      "Escolha prioridade normal, preferencial ou urgente.",
      "Oriente o paciente a acompanhar TV ou link público.",
    ],
    checklist: ["Fila correta selecionada", "Prioridade validada", "Senha emitida", "Paciente orientado"],
    examples: ["Paciente preferencial recebe prioridade sem alterar o prefixo da fila."],
    keywords: ["recepção", "senha", "paciente", "preferencial", "fila"],
  },
  {
    id: "atendente-guiche",
    role: "atendente",
    title: "2. Operar guichê e encaminhar",
    summary: "Chame a próxima senha, registre orientação e encaminhe para consulta, exame ou nova fila.",
    duration: "7 min",
    videoTitle: "Do guichê ao atendimento certo",
    videoDescription: "Mostra como evitar perda de histórico ao encaminhar pacientes.",
    steps: [
      "Ocupe um ponto de atendimento disponível.",
      "Chame a próxima senha da fila do guichê.",
      "Registre observações curtas quando houver contexto relevante.",
      "Encaminhe para a fila final correta e confirme a chamada na TV.",
    ],
    checklist: ["Ponto ocupado", "Senha chamada", "Observação registrada", "Encaminhamento confirmado"],
    examples: ["Guichê identifica exame laboratorial e encaminha para LAB sem gerar senha manual."],
    keywords: ["guichê", "encaminhar", "ponto", "chamada", "triagem"],
  },
  {
    id: "clinico-atendimento",
    role: "clinico",
    title: "1. Chamar e finalizar atendimento",
    summary: "Use seu consultório ou sala para chamar paciente, registrar conclusão e solicitar retorno quando necessário.",
    duration: "6 min",
    videoTitle: "Atendimento clínico conectado à fila",
    videoDescription: "Treinamento para manter histórico correto sem burocracia extra.",
    steps: [
      "Ocupe o ponto de atendimento vinculado ao seu perfil.",
      "Chame a senha encaminhada para sua fila.",
      "Inicie e finalize o atendimento no sistema.",
      "Marque retorno quando o paciente precisar voltar à recepção ou a outra etapa.",
    ],
    checklist: ["Consultório ocupado", "Paciente chamado", "Atendimento finalizado", "Retorno indicado quando necessário"],
    examples: ["Enfermagem finaliza triagem e envia retorno para consulta médica."],
    keywords: ["atendimento", "médico", "enfermeiro", "retorno", "consultório"],
  },
];

export const roleOrder: Record<ManualRole, string[]> = {
  admin: ["admin-configuracao-unidade", "admin-filas-canais", "admin-permissoes"],
  gestor: ["gestor-operacao-diaria", "gestor-relatorios-auditoria"],
  atendente: ["atendente-recepcao", "atendente-guiche"],
  clinico: ["clinico-atendimento"],
};

export const manualStats = [
  { label: "Perfis", value: manualRoles.length.toString(), icon: Users },
  { label: "Aulas", value: manualSections.length.toString(), icon: Activity },
  { label: "Checklists", value: manualSections.reduce((total, section) => total + section.checklist.length, 0).toString(), icon: ClipboardCheck },
];