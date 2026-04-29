import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import LeadCard, { Lead, PipelineStage } from './LeadCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

import { differenceInDays } from 'date-fns';

interface PipelineKanbanProps {
  leads: Lead[];
  onLeadMove: (leadId: string, newStage: PipelineStage) => void;
  onLeadClick: (lead: Lead) => void;
  onAddTask?: (lead: Lead) => void;
  highlightDaysThreshold?: number;
}

const STAGES: { id: PipelineStage; label: string }[] = [
  { id: 'novo_lead', label: 'Novo Lead' },
  { id: 'contato_inicial', label: 'Contato Inicial' },
  { id: 'qualificacao', label: 'Qualificação' },
  { id: 'demonstracao', label: 'Demonstração' },
  { id: 'proposta', label: 'Proposta' },
  { id: 'negociacao', label: 'Negociação' },
  { id: 'fechado_ganho', label: 'Ganhos' },
  { id: 'fechado_perdido', label: 'Perdidos' },
];

const PipelineKanban: React.FC<PipelineKanbanProps> = ({ 
  leads, 
  onLeadMove, 
  onLeadClick,
  onAddTask,
  highlightDaysThreshold = 3 // Padrão de 3 dias
}) => {
  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    onLeadMove(draggableId, destination.droppableId as PipelineStage);
  };

  const getLeadsByStage = (stageId: PipelineStage) => {
    return leads.filter((lead) => lead.estagio_pipeline === stageId);
  };

  const calculateStageTotal = (stageLeads: Lead[]) => {
    return stageLeads.reduce((acc, lead) => acc + (Number(lead.valor_potencial) || 0), 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex h-full gap-4 overflow-x-auto pb-4 px-1 min-h-[calc(100vh-250px)]">
        {STAGES.map((stage) => {
          const stageLeads = getLeadsByStage(stage.id);
          const totalValue = calculateStageTotal(stageLeads);

          return (
            <div 
              key={stage.id} 
              className="flex flex-col min-w-[280px] w-[300px] bg-muted/30 rounded-lg p-3 border border-border/50"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">{stage.label}</h3>
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                    {stageLeads.length}
                  </Badge>
                </div>
                {totalValue > 0 && (
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {formatCurrency(totalValue)}
                  </span>
                )}
              </div>

              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <ScrollArea 
                    className={cn(
                      "flex-1 rounded-md transition-colors",
                      snapshot.isDraggingOver ? "bg-primary/5" : ""
                    )}
                  >
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="min-h-[200px] flex flex-col"
                    >
                      {stageLeads.map((lead, index) => {
                        const daysSinceInteraction = differenceInDays(new Date(), new Date(lead.data_atualizacao));
                        const isStale = daysSinceInteraction >= highlightDaysThreshold;

                        return (
                          <Draggable key={lead.id} draggableId={lead.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={{ ...provided.draggableProps.style }}
                                className={cn(
                                  "relative transition-all",
                                  isStale && "ring-1 ring-red-500/30 rounded-lg mb-0.5"
                                )}
                              >
                                {isStale && (
                                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full z-20 shadow-sm animate-pulse">
                                    {daysSinceInteraction}D
                                  </div>
                                )}
                                <LeadCard 
                                  lead={lead} 
                                  onClick={onLeadClick}
                                  onAddTask={onAddTask}
                                  isDragging={snapshot.isDragging}
                                />
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  </ScrollArea>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};

export default PipelineKanban;
