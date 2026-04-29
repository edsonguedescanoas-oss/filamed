import { supabase } from '@/integrations/supabase/client';
import { TriggerType } from './triggers';
import { ActionType } from './actions';

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'delay';
  data: any;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export class WorkflowEngine {
  async processEvent(triggerType: TriggerType, leadId: string, context?: any) {
    console.log(`[WorkflowEngine] Evento recebido: ${triggerType} para lead ${leadId}`);

    // 1. Buscar workflows ativos para este trigger
    const { data: workflows, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('status', 'ativo');

    if (error || !workflows) return;

    // 2. Filtrar workflows que possuem este trigger
    const matchingWorkflows = workflows.filter(w => {
      const config = w.configuracao as unknown as WorkflowDefinition;
      return config.nodes?.some(node => node.type === 'trigger' && node.data.type === triggerType);
    });

    // 3. Executar cada workflow correspondente
    for (const workflow of matchingWorkflows) {
      await this.executeWorkflow(workflow, leadId, triggerType, context);
    }
  }

  private async executeWorkflow(workflow: any, leadId: string, trigger: string, context: any) {
    const executionId = crypto.randomUUID();
    
    try {
      // Log de início de execução
      await supabase.from('workflows_execucoes').insert({
        workflow_id: workflow.id,
        lead_id: leadId,
        trigger: trigger,
        status: 'em_andamento',
        detalhes: { executionId, context }
      });

      const config = workflow.configuracao as unknown as WorkflowDefinition;
      const startNode = config.nodes.find(n => n.type === 'trigger' && n.data.type === trigger);
      
      if (!startNode) return;

      // Percorrer o fluxo (simplificado para uma linha reta ou árvore básica)
      await this.traverseAndExecute(startNode.id, config, leadId);

      // Log de sucesso
      await supabase.from('workflows_execucoes')
        .update({ status: 'sucesso' })
        .eq('detalhes->>executionId', executionId);

    } catch (error: any) {
      console.error(`[WorkflowEngine] Erro no workflow ${workflow.id}:`, error);
      
      await supabase.from('workflows_execucoes')
        .update({ status: 'erro', detalhes: { error: error.message } })
        .eq('detalhes->>executionId', executionId);
    }
  }

  private async traverseAndExecute(nodeId: string, config: WorkflowDefinition, leadId: string) {
    const outgoingEdges = config.edges.filter(e => e.source === nodeId);
    
    for (const edge of outgoingEdges) {
      const nextNode = config.nodes.find(n => n.id === edge.target);
      if (!nextNode) continue;

      if (nextNode.type === 'action') {
        await this.runAction(nextNode.data.type, leadId, nextNode.data.params);
      }

      // Recursão para o próximo nível
      await this.traverseAndExecute(nextNode.id, config, leadId);
    }
  }

  private async runAction(actionType: ActionType, leadId: string, params: any) {
    console.log(`[WorkflowEngine] Executando ação ${actionType} para lead ${leadId}`);
    
    switch (actionType) {
      case 'mover_lead_pipeline':
        await supabase.from('leads').update({ estagio_pipeline: params.newStage }).eq('id', leadId);
        break;
      case 'adicionar_tag':
        // Lógica de append de array no postgres
        const { data: lead } = await supabase.from('leads').select('tags').eq('id', leadId).single();
        const currentTags = lead?.tags || [];
        if (!currentTags.includes(params.tag)) {
          await supabase.from('leads').update({ tags: [...currentTags, params.tag] }).eq('id', leadId);
        }
        break;
      // Outras ações seriam integradas aqui (WADUK, Email, etc)
      default:
        console.warn(`[WorkflowEngine] Ação ${actionType} não implementada.`);
    }
  }
}

export const workflowEngine = new WorkflowEngine();
