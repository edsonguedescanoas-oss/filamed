export type TriggerType = 
  | 'lead_criado' 
  | 'lead_estagio_alterado' 
  | 'lead_sem_interacao' 
  | 'whatsapp_resposta_recebida' 
  | 'demonstracao_agendada' 
  | 'proposta_enviada' 
  | 'lead_fechado';

export interface TriggerDefinition {
  type: TriggerType;
  label: string;
  description: string;
}

export const CRM_TRIGGERS: TriggerDefinition[] = [
  {
    type: 'lead_criado',
    label: 'Lead Criado',
    description: 'Disparado quando um novo lead entra no sistema.'
  },
  {
    type: 'lead_estagio_alterado',
    label: 'Mudança de Estágio',
    description: 'Disparado quando um lead muda de coluna no pipeline.'
  },
  {
    type: 'lead_sem_interacao',
    label: 'Sem Interação',
    description: 'Disparado quando o lead está há X dias sem contato.'
  },
  {
    type: 'whatsapp_resposta_recebida',
    label: 'Resposta WhatsApp',
    description: 'Disparado ao receber uma mensagem do lead.'
  },
  {
    type: 'demonstracao_agendada',
    label: 'Demonstração Agendada',
    description: 'Disparado quando uma demo é marcada.'
  },
  {
    type: 'proposta_enviada',
    label: 'Proposta Enviada',
    description: 'Disparado ao enviar uma proposta comercial.'
  },
  {
    type: 'lead_fechado',
    label: 'Lead Fechado (Ganho/Perdido)',
    description: 'Disparado ao finalizar uma negociação.'
  }
];
