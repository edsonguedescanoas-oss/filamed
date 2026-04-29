import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Video, 
  User, 
  Building2, 
  ExternalLink,
  MoreVertical,
  CheckCircle2,
  XCircle,
  MessageSquare
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, isSameDay, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { WorkflowEngine } from '@/lib/workflows/workflowEngine';

const MinhaAgenda = () => {
  const [demos, setDemos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgenda();
  }, []);

  async function fetchAgenda() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('demonstracoes')
        .select('*, lead:leads(id, nome_clinica, nome_contato, telefone)')
        .order('data_hora', { ascending: true });

      if (error) throw error;
      setDemos(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar agenda", { description: error.message });
    } finally {
      setLoading(false);
    }
  }

  const updateStatus = async (demo: any, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('demonstracoes')
        .update({ status: newStatus as any })
        .eq('id', demo.id);

      if (error) throw error;

      if (newStatus === 'realizada') {
        await WorkflowEngine.disparar('demonstracao_realizada', { leadId: demo.lead_id });
      }

      setDemos(prev => prev.map(d => d.id === demo.id ? { ...d, status: newStatus } : d));
      toast.success("Status atualizado");
    } catch (error: any) {
      toast.error("Erro ao atualizar", { description: error.message });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'agendada': return <Badge variant="outline" className="text-sky-600 bg-sky-50">Agendada</Badge>;
      case 'confirmada': return <Badge className="bg-green-500">Confirmada</Badge>;
      case 'realizada': return <Badge variant="secondary" className="bg-muted">Realizada</Badge>;
      case 'cancelada': return <Badge variant="destructive">Cancelada</Badge>;
      case 'nao_compareceu': return <Badge variant="outline" className="text-red-600 border-red-200">Não Compareceu</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const todayDemos = demos.filter(d => isSameDay(new Date(d.data_hora), startOfToday()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Minha Agenda Comercial</h2>
          <p className="text-sm text-muted-foreground">Demonstrações e reuniões agendadas.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1">
            {todayDemos.length} para hoje
          </Badge>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {demos.length === 0 ? (
            <Card className="border-dashed py-12 text-center text-muted-foreground">
              Nenhuma demonstração agendada para o período.
            </Card>
          ) : (
            demos.map((demo) => (
              <Card key={demo.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 p-3 rounded-lg flex flex-col items-center justify-center min-w-[70px]">
                      <span className="text-xs font-bold text-primary uppercase">
                        {format(new Date(demo.data_hora), "MMM", { locale: ptBR })}
                      </span>
                      <span className="text-2xl font-bold text-primary">
                        {format(new Date(demo.data_hora), "dd")}
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">{demo.lead?.nome_clinica}</span>
                        {getStatusBadge(demo.status)}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <Clock className="h-4 w-4 text-primary" /> 
                          {format(new Date(demo.data_hora), "HH:mm")}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" /> {demo.lead?.nome_contato}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="gap-2 bg-green-600 hover:bg-green-700"
                      asChild
                    >
                      <a href={demo.link_videochamada} target="_blank" rel="noopener noreferrer">
                        <Video className="h-4 w-4" /> Iniciar Demo
                      </a>
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownContent align="end">
                        <DropdownMenuItem className="gap-2" onClick={() => updateStatus(demo, 'realizada')}>
                          <CheckCircle2 className="h-4 w-4 text-green-500" /> Marcar como Realizada
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2" onClick={() => updateStatus(demo, 'nao_compareceu')}>
                          <XCircle className="h-4 w-4 text-orange-500" /> Lead não compareceu
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2" onClick={() => updateStatus(demo, 'cancelada')}>
                          <XCircle className="h-4 w-4 text-red-500" /> Cancelar Reunião
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                          <MessageSquare className="h-4 w-4 text-blue-500" /> Falar no WhatsApp
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MinhaAgenda;
