export interface Condition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

export function evaluateCondition(lead: any, condition: Condition): boolean {
  const leadValue = lead[condition.field];
  
  switch (condition.operator) {
    case 'equals': return leadValue === condition.value;
    case 'not_equals': return leadValue !== condition.value;
    case 'contains': return Array.isArray(leadValue) ? leadValue.includes(condition.value) : String(leadValue).includes(String(condition.value));
    case 'greater_than': return Number(leadValue) > Number(condition.value);
    case 'less_than': return Number(leadValue) < Number(condition.value);
    default: return false;
  }
}

export const CRM_CONDITIONS = [
  { label: 'Estágio Atual', field: 'estagio_pipeline' },
  { label: 'Temperatura', field: 'temperatura_lead' },
  { label: 'Tags', field: 'tags' },
  { label: 'Valor Potencial', field: 'valor_potencial' },
  { label: 'Dias sem contato', field: 'dias_sem_contato' },
];
