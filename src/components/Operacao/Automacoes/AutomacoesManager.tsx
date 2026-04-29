import { useState, useEffect } from "react";
import { 
  Plus, 
  Play, 
  Pause, 
  Copy, 
  Trash2, 
  Workflow, 
  Activity, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  MoreVertical,
  History,
  BarChart3,
  MessageSquare,
  Mail,
  Smartphone,
  CheckSquare,
  MoveHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import WorkflowBuilder from "./WorkflowBuilder";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AutomacoesManagerProps {
  showTitle?: boolean;
}

export default function AutomacoesManager({ showTitle = true }: AutomacoesManagerProps) {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [actionMetrics, setActionMetrics] = useState<any[]>([]);
  const [summary, setSummary] = useState({ total24h: 0, successRate: 100 });
  const [activeTab, setActiveTab] = useState("lista");

  useEffect(() => {
    fetchWorkflows();
    fetchExecutions();
    fetchActionMetrics();

    // Inscrição para atualizações em tempo real das execuções e métricas
    const channel = supabase
      .channel('automacoes-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'workflows_execucoes' },
        () => {
          fetchExecutions();
          fetchActionMetrics();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workflows' },
        () => {
          fetchWorkflows();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchWorkflows() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkflows(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar workflows", { description: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function fetchExecutions() {
    try {
      const { data, error } = await supabase
        .from('workflows_execucoes')
        .select('*, lead:leads(nome_clinica)')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setExecutions(data || []);
    } catch (error: any) {
      console.error(error);
    }
  }

  async function fetchActionMetrics() {
    try {
      const { data, error } = await supabase
        .from('workflows_execucoes')
        .select('tipo_acao, status');

      if (error) throw error;

      const stats: Record<string, { total: number, success: number, fail: number }> = {};
      
      data?.forEach(row => {
        if (row.tipo_acao === 'trigger') return; 
        const type = row.tipo_acao || 'unknown';
        if (!stats[type]) stats[type] = { total: 0, success: 0, fail: 0 };
        stats[type].total++;
        if (row.status === 'sucesso') stats[type].success++;
        else stats[type].fail++;
      });

      const metricsArray = Object.entries(stats).map(([type, s]) => ({
        type,
        total: s.total,
        success: s.success,
        fail: s.fail,
        successRate: s.total > 0 ? (s.success / s.total) * 100 : 0,
        failRate: s.total > 0 ? (s.fail / s.total) * 100 : 0
      }));

      setActionMetrics(metricsArray);

      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recent, error: recentError } = await supabase
        .from('workflows_execucoes')
        .select('status')
        .gt('data_execucao', dayAgo);

      if (!recentError && recent) {
        const total = recent.length;
        const success = recent.filter(r => r.status === 'sucesso').length;
        setSummary({
          total24h: total,
          successRate: total > 0 ? (success / total) * 100 : 100
        });
      }
    } catch (error: any) {
      console.error("Erro ao carregar métricas:", error);
    }
  }

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ativo' ? 'pausado' : 'ativo';
    try {
      const { error } = await supabase
        .from('workflows')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      setWorkflows(prev => prev.map(w => w.id === id ? { ...w, status: newStatus } : w));
      toast.success(`Workflow ${newStatus === 'ativo' ? 'ativado' : 'pausado'}`);
    } catch (error: any) {
      toast.error("Erro ao alterar status", { description: error.message });
    }
  };

  const handleSaveWorkflow = async (config: any) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('workflows')
        .insert({
          titulo: "Nova Automação CRM",
          descricao: "Fluxo automatizado de atendimento comercial.",
          configuracao: config,
          status: 'pausado',
          usuario_id: userData.user?.id
        })
        .select()
        .single();

      if (error) throw error;
      
      setWorkflows([data, ...workflows]);
      setIsCreating(false);
      toast.success("Workflow criado com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao salvar", { description: error.message });
    }
  };

  return (
    <div className="space-y-6">
      {showTitle && (
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Activity className="h-8 w-8 text-primary" />
              Automações & Workflows
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie fluxos automáticos, métricas de performance e gatilhos de notificação.
            </p>
          </div>
          <Button onClick={() => setIsCreating(!isCreating)} className="gap-2">
            {isCreating ? <ChevronRight className="h-4 w-4 rotate-180" /> : <Plus className="h-4 w-4" />}
            {isCreating ? "Voltar à Lista" : "Novo Workflow"}
          </Button>
        </div>
      )}

      {isCreating ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Construtor de Automação</h2>
            <Badge variant="outline">Editor Visual</Badge>
          </div>
          <WorkflowBuilder onSave={handleSaveWorkflow} />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Workflows Ativos</p>
                    <p className="text-2xl font-bold">{workflows.filter(w => w.status === 'ativo').length}</p>
                  </div>
                  <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Execuções (24h)</p>
                    <p className="text-2xl font-bold">{summary.total24h.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    <Activity className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Taxa de Sucesso</p>
                    <p className={`text-2xl font-bold ${summary.successRate > 95 ? 'text-green-600' : 'text-orange-600'}`}>
                      {summary.successRate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="lista" className="gap-2">
                <Workflow className="h-4 w-4" /> Todos Workflows
              </TabsTrigger>
              <TabsTrigger value="metrics" className="gap-2">
                <BarChart3 className="h-4 w-4" /> Métricas por Ação
              </TabsTrigger>
              <TabsTrigger value="logs" className="gap-2">
                <History className="h-4 w-4" /> Logs Recentes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="metrics" className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { type: 'enviar_whatsapp_template', label: 'WhatsApp', icon: MessageSquare, color: 'text-green-600', bg: 'bg-green-50' },
                  { type: 'enviar_email', label: 'E-mail', icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { type: 'enviar_sms', label: 'SMS', icon: Smartphone, color: 'text-purple-600', bg: 'bg-purple-50' },
                  { type: 'criar_tarefa', label: 'Tarefas', icon: CheckSquare, color: 'text-orange-600', bg: 'bg-orange-50' },
                  { type: 'mover_lead_pipeline', label: 'Mover Pipeline', icon: MoveHorizontal, color: 'text-sky-600', bg: 'bg-sky-50' },
                ].map((action) => {
                  const metric = actionMetrics.find(m => m.type === action.type) || { total: 0, success: 0, fail: 0, successRate: 0, failRate: 0 };
                  const Icon = action.icon;
                  return (
                    <Card key={action.type}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-lg ${action.bg}`}>
                              <Icon className={`h-4 w-4 ${action.color}`} />
                            </div>
                            <CardTitle className="text-sm font-semibold">{action.label}</CardTitle>
                          </div>
                          <Badge variant="secondary" className="text-[10px]">
                            {metric.total} execs
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Taxa de Sucesso</span>
                            <span className="font-bold text-green-600">{metric.successRate.toFixed(1)}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 transition-all" 
                              style={{ width: `${metric.successRate}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-muted-foreground pt-1">
                            <span>Falhas: {metric.failRate.toFixed(1)}%</span>
                            <span>Total: {metric.total}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="lista" className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workflows.map((w) => (
                  <Card key={w.id} className="group hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <CardTitle className="text-base">{w.titulo}</CardTitle>
                          <CardDescription className="text-xs line-clamp-1">{w.descricao}</CardDescription>
                        </div>
                        <Badge variant={w.status === 'ativo' ? 'default' : 'secondary'} className="capitalize">
                          {w.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex gap-4">
                          <span>{w.execucoes_total || 0} execuções</span>
                          <span className="text-green-600">{w.sucesso_taxa || 0}% sucesso</span>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={() => toggleStatus(w.id, w.status)}
                          >
                            {w.status === 'ativo' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="gap-2">
                                <Copy className="h-4 w-4" /> Duplicar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="gap-2 text-destructive">
                                <Trash2 className="h-4 w-4" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {workflows.length === 0 && !loading && (
                  <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl">
                    <Workflow className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhum workflow encontrado.</p>
                    <Button variant="link" onClick={() => setIsCreating(true)}>Criar meu primeiro workflow</Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="logs" className="pt-4">
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {executions.map((ex) => (
                      <div key={ex.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "h-2 w-2 rounded-full",
                            ex.status === 'sucesso' ? "bg-green-500" : "bg-red-500"
                          )} />
                          <div>
                            <p className="text-sm font-medium">{ex.lead?.nome_clinica || 'Lead desconhecido'}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{ex.trigger}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium">{format(new Date(ex.data_execucao), "HH:mm:ss")}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {format(new Date(ex.data_execucao), "dd MMM yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))}
                    {executions.length === 0 && (
                      <div className="p-8 text-center text-muted-foreground">Nenhum log de execução recente.</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

// Utility to merge classes
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}