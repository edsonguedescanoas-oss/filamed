/**
 * Templates de cadências pré-configuradas para o CRM FilaMed.
 */

export interface CadenceStep {
  day: number;
  channel: 'whatsapp' | 'email' | 'ligacao' | 'tarefa';
  content: string;
  templateName?: string;
}

export interface Cadence {
  id: string;
  name: string;
  description: string;
  steps: CadenceStep[];
}

export const CADENCE_TEMPLATES: Cadence[] = [
  {
    id: 'padrao_14_dias',
    name: 'Cadência Padrão (14 dias)',
    description: '7 pontos de contato alternando WhatsApp e e-mail.',
    steps: [
      { day: 0, channel: 'whatsapp', content: 'Olá {{nome_contato}}, sou da FilaMed. Vi que você se interessou por nossa solução para a {{nome_clinica}}.' },
      { day: 0, channel: 'email', content: 'Apresentação FilaMed' },
      { day: 2, channel: 'whatsapp', content: 'Conseguiu ver o material que enviei?' },
      { day: 5, channel: 'email', content: 'Case de sucesso: Como a Clínica X reduziu filas em 40%' },
      { day: 7, channel: 'ligacao', content: 'Tentar contato telefônico para agendar demo' },
      { day: 10, channel: 'whatsapp', content: 'Ainda faz sentido conversarmos sobre a {{nome_clinica}}?' },
      { day: 14, channel: 'email', content: 'Última tentativa de contato - FilaMed' }
    ]
  },
  {
    id: 'rapida_7_dias',
    name: 'Cadência Rápida (7 dias)',
    description: 'Para leads quentes que pediram demonstração.',
    steps: [
      { day: 0, channel: 'whatsapp', content: 'Olá {{nome_contato}}, vamos agendar sua demo da FilaMed?' },
      { day: 1, channel: 'ligacao', content: 'Follow-up telefônico imediato' },
      { day: 3, channel: 'email', content: 'Link para agendamento de demonstração' },
      { day: 5, channel: 'whatsapp', content: 'Alguma dúvida sobre os horários disponíveis?' },
      { day: 7, channel: 'ligacao', content: 'Tentativa final de agendamento' }
    ]
  },
  {
    id: 'reengajamento_21_dias',
    name: 'Cadência de Reengajamento (21 dias)',
    description: 'Para leads frios que não respondem há mais de 30 dias.',
    steps: [
      { day: 0, channel: 'email', content: 'Sentimos sua falta na FilaMed' },
      { day: 7, channel: 'whatsapp', content: 'Olá {{nome_contato}}, temos novidades no sistema que podem interessar à {{nome_clinica}}.' },
      { day: 14, channel: 'email', content: 'Novos recursos e planos 2026' },
      { day: 21, channel: 'whatsapp', content: 'Último contato de reengajamento.' }
    ]
  }
];

export function parseContent(content: string, vars: Record<string, string>): string {
  let parsed = content;
  Object.entries(vars).forEach(([key, value]) => {
    parsed = parsed.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  });
  return parsed;
}
