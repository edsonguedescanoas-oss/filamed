import React from 'react';
import { MoreVertical, Phone, MessageSquare, Calendar, TrendingUp } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type LeadTemperature = 'frio' | 'morno' | 'quente';
export type PipelineStage = 'novo_lead' | 'contato_inicial' | 'qualificacao' | 'demonstracao' | 'proposta' | 'negociacao' | 'fechado_ganho' | 'fechado_perdido';

export interface Lead {
  id: string;
  nome_clinica: string;
  nome_contato: string;
  estagio_pipeline: PipelineStage;
  valor_potencial: number;
  temperatura_lead: LeadTemperature;
  data_atualizacao: string;
  telefone?: string;
  email?: string;
}

interface LeadCardProps {
  lead: Lead;
  onClick: (lead: Lead) => void;
  isDragging?: boolean;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, onClick, isDragging }) => {
  const getTemperatureColor = (temp: LeadTemperature) => {
    switch (temp) {
      case 'quente': return 'bg-orange-500 hover:bg-orange-600';
      case 'morno': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'frio': return 'bg-blue-500 hover:bg-blue-600';
      default: return 'bg-slate-500';
    }
  };

  const getTemperatureLabel = (temp: LeadTemperature) => {
    switch (temp) {
      case 'quente': return 'Quente';
      case 'morno': return 'Morno';
      case 'frio': return 'Frio';
      default: return temp;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const timeWithoutInteraction = formatDistanceToNow(new Date(lead.data_atualizacao), { 
    addSuffix: true, 
    locale: ptBR 
  });

  return (
    <Card 
      className={cn(
        "cursor-grab active:cursor-grabbing hover:shadow-md transition-all border-l-4 mb-3",
        isDragging && "shadow-xl ring-2 ring-primary/20",
        lead.temperatura_lead === 'quente' ? "border-l-orange-500" : 
        lead.temperatura_lead === 'morno' ? "border-l-yellow-500" : "border-l-blue-500"
      )}
      onClick={() => onClick(lead)}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <Badge className={cn("text-[10px] px-1.5 py-0", getTemperatureColor(lead.temperatura_lead))}>
            {getTemperatureLabel(lead.temperatura_lead)}
          </Badge>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="gap-2">
                <Phone className="h-4 w-4" /> Ligar
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <MessageSquare className="h-4 w-4" /> WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <Calendar className="h-4 w-4" /> Agendar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <h3 className="font-semibold text-sm line-clamp-1 mb-1">{lead.nome_clinica}</h3>
        <p className="text-xs text-muted-foreground mb-3">{lead.nome_contato}</p>

        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-1 text-xs font-medium text-primary">
            <TrendingUp className="h-3 w-3" />
            {formatCurrency(lead.valor_potencial)}
          </div>
          <span className="text-[10px] text-muted-foreground italic">
            Ativo {timeWithoutInteraction}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeadCard;
