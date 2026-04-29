export type ActionType = 
  | 'enviar_whatsapp_template' 
  | 'enviar_email' 
  | 'enviar_sms' 
  | 'criar_tarefa' 
  | 'mover_lead_pipeline' 
  | 'adicionar_tag' 
  | 'notificar_slack';

export interface ActionDefinition {
  type: ActionType;
  label: string;
  description: string;
  params?: Record<string, any>;
}

export const CRM_ACTIONS: ActionDefinition[] = [
  {
    type: 'enviar_whatsapp_template',
    label: 'Enviar WhatsApp (WADUK)',
    description: 'Envia uma mensagem automática usando um template.'
  },
  {
    type: 'enviar_email',
    label: 'Enviar E-mail',
    description: 'Dispara um e-mail de follow-up transacional.'
  },
  {
    type: 'enviar_sms',
    label: 'Enviar SMS',
    description: 'Envia um SMS de alerta rápido.'
  },
  {
    type: 'criar_tarefa',
    label: 'Criar Tarefa CRM',
    description: 'Adiciona uma tarefa para o responsável do lead.'
  },
  {
    type: 'mover_lead_pipeline',
    label: 'Mover no Pipeline',
    description: 'Altera o estágio do lead automaticamente.'
  },
  {
    type: 'adicionar_tag',
    label: 'Adicionar Tag',
    description: 'Insere uma etiqueta de segmentação no lead.'
  },
  {
    type: 'notificar_slack',
    label: 'Notificar Slack',
    description: 'Envia um alerta para o canal da equipe comercial.'
  }
];
