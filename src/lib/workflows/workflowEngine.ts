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
    
    // Log de disparo do gatilho
    await this.logExecucao(evento, contexto, 'trigger');

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
    
    try {
      // 1. Buscar dados do lead
      const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single();
      if (!lead || !lead.telefone) throw new Error("Lead não encontrado ou sem telefone");

      // 2. Enviar WhatsApp via WADUK
      await WadukClient.enviarTemplate(lead.telefone, 'demonstracao_agendada', {
        nome: lead.nome_contato || 'Cliente',
        data: data.data_hora,
        link: data.link_videochamada
      });

      await this.logExecucao('demonstracao_agendada', ctx, 'enviar_whatsapp_template', 'sucesso');
      console.log("Lembretes de 24h e 1h agendados (simulação) para", lead.telefone);
    } catch (error: any) {
      await this.logExecucao('demonstracao_agendada', ctx, 'enviar_whatsapp_template', 'falha');
      console.error("Erro no workflow handleDemoAgendada:", error);
    }
  }

  private static async handleDemoRealizada(ctx: WorkflowContext) {
    const { leadId } = ctx;
    
    try {
      // Mover lead para estágio "demonstracao"
      const { error } = await supabase.from('leads').update({ 
        estagio_pipeline: 'demonstracao' as any,
        updated_at: new Date().toISOString()
      }).eq('id', leadId);

      if (error) throw error;

      await this.logExecucao('demonstracao_realizada', ctx, 'mover_lead_pipeline', 'sucesso');
      console.log("Lead movido para estágio 'demonstracao'");
    } catch (error: any) {
      await this.logExecucao('demonstracao_realizada', ctx, 'mover_lead_pipeline', 'falha');
      console.error("Erro no workflow handleDemoRealizada:", error);
    }
  }

  private static async logExecucao(evento: string, ctx: WorkflowContext, tipoAcao: string = 'trigger', status: 'sucesso' | 'falha' = 'sucesso') {
    try {
      await supabase.from('workflows_execucoes').insert({
        lead_id: ctx.leadId,
        trigger: evento,
        tipo_acao: tipoAcao,
        status: status,
        detalhes: ctx.data || {}
      } as any);
    } catch (e) {
      console.warn("Falha ao logar execução do workflow", e);
    }
  }
}
