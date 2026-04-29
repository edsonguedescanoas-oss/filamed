/**
 * Motor de workflows simples para automação do CRM
 */

import { WadukClient } from '@/lib/waduk-client';
import { supabase } from '@/integrations/supabase/client';

export type WorkflowEvent = 
  | 'novo_lead' 
  | 'mudanca_estagio' 
  | 'demonstracao_agendada' 
  | 'demonstracao_realizada';

interface WorkflowContext {
  leadId: string;
  data?: any;
}

export class WorkflowEngine {
  static async disparar(evento: WorkflowEvent, contexto: WorkflowContext) {
    console.log(`[WorkflowEngine] Evento disparado: ${evento}`, contexto);
    
    // Log de execução no banco
    await this.logExecucao(evento, contexto);

    switch (evento) {
      case 'demonstracao_agendada':
        await this.handleDemoAgendada(contexto);
        break;
      case 'demonstracao_realizada':
        await this.handleDemoRealizada(contexto);
        break;
    }
  }

  private static async handleDemoAgendada(ctx: WorkflowContext) {
    const { leadId, data } = ctx;
    
    // 1. Buscar dados do lead
    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single();
    if (!lead || !lead.telefone) return;

    // 2. Enviar WhatsApp via WADUK
    await WadukClient.enviarTemplate(lead.telefone, 'demonstracao_agendada', {
      nome: lead.nome_contato || 'Cliente',
      data: data.data_hora,
      link: data.link_videochamada
    });

    console.log("Lembretes de 24h e 1h agendados (simulação) para", lead.telefone);
  }

  private static async handleDemoRealizada(ctx: WorkflowContext) {
    const { leadId } = ctx;
    
    // Mover lead para estágio "demonstracao"
    await supabase.from('leads').update({ 
      estagio_pipeline: 'demonstracao' as any,
      updated_at: new Date().toISOString()
    }).eq('id', leadId);

    console.log("Lead movido para estágio 'demonstracao'");
  }

  private static async logExecucao(evento: string, ctx: WorkflowContext) {
    try {
      await supabase.from('workflows_execucoes').insert({
        lead_id: ctx.leadId,
        trigger: evento,
        status: 'sucesso',
        detalhes: ctx.data || {}
      } as any);
    } catch (e) {
      console.warn("Falha ao logar execução do workflow", e);
    }
  }
}
