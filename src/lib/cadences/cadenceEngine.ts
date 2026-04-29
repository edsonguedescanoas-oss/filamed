/**
 * Motor de execução de cadências.
 */

import { supabase } from '@/integrations/supabase/client';
import { WadukClient } from '@/lib/waduk-client';
import { CADENCE_TEMPLATES, parseContent } from './cadenceTemplates';

export class CadenceEngine {
  /**
   * Atribui uma cadência a um lead e executa o passo inicial (Dia 0)
   */
  static async atribuirCadence(leadId: string, cadenceId: string) {
    const cadence = CADENCE_TEMPLATES.find(c => c.id === cadenceId);
    if (!cadence) throw new Error("Cadência não encontrada");

    await supabase.from('leads').update({
      cadence_id: cadenceId,
      cadence_step_atual: 0,
      updated_at: new Date().toISOString()
    } as any).eq('id', leadId);

    // Executar passos do Dia 0
    await this.executarPassosDoDia(leadId, cadence, 0);
  }

  /**
   * Executa os passos de uma cadência para um determinado dia
   */
  private static async executarPassosDoDia(leadId: string, cadence: any, day: number) {
    const steps = cadence.steps.filter((s: any) => s.day === day);
    if (steps.length === 0) return;

    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single();
    if (!lead) return;

    // Extração segura de metadados
    const metadata = (lead.metadata as Record<string, any>) || {};

    const vars = {
      nome_contato: lead.nome_contato || 'Cliente',
      nome_clinica: lead.nome_clinica || 'sua clínica',
      data_demo: String(metadata.data_demo || '')
    };

    for (const step of steps) {
      const content = parseContent(step.content, vars);
      
      switch (step.channel) {
        case 'whatsapp':
          if (lead.telefone) {
            await WadukClient.enviarMensagemTexto(lead.telefone, content);
          }
          break;
        case 'email':
          console.log(`[Email] Enviando para ${lead.email}: ${content}`);
          break;
        case 'ligacao':
        case 'tarefa':
          // Criar tarefa interna no CRM (simulado)
          console.log(`[Tarefa] Criada para lead ${lead.nome_clinica}: ${content}`);
          break;
      }
    }
    
    // Log de execução
    await supabase.from('workflows_execucoes').insert({
      lead_id: leadId,
      trigger: `cadence_step_day_${day}`,
      status: 'sucesso',
      detalhes: { cadence_id: cadence.id, day }
    } as any);
  }

  /**
   * Função que seria chamada por um cron diário para processar cadências
   */
  static async processarCadenciasDiarias() {
    // Busca leads ativos em cadências
    const { data: leadsEmCadencia } = await supabase
      .from('leads')
      .select('id, cadence_id, cadence_step_atual, data_criacao')
      .not('cadence_id', 'is', null);

    if (!leadsEmCadencia) return;

    for (const lead of (leadsEmCadencia as any[])) {
      const cadence = CADENCE_TEMPLATES.find(c => c.id === lead.cadence_id);
      if (!cadence) continue;

      // Cálculo simplificado de dias passados desde o início
      const dataInicio = new Date(lead.data_criacao); 
      const hoje = new Date();
      const diffDays = Math.floor((hoje.getTime() - dataInicio.getTime()) / (1000 * 3600 * 24));

      // Verifica se há passos para o dia atual
      await this.executarPassosDoDia(lead.id, cadence, diffDays);
    }
  }
}
