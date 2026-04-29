import { createFileRoute } from "@tanstack/react-router";
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
  History
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
import WorkflowBuilder from "@/components/Operacao/Automacoes/WorkflowBuilder";
import { RoleGuard } from "@/components/role-guard";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/operacao/automacoes")({
  component: () => (
    <RoleGuard permission="manage_users" path="/operacao/automacoes">
      <AutomacoesPage />
    </RoleGuard>
  ),
});

function AutomacoesPage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchWorkflows();
    fetchExecutions();
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
    <div className="flex flex-col h-screen bg-background">
      <header className="px-6 py-4 border-b flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Automações & Workflows
          </h1>
          <p className="text-sm text-muted-foreground">Configure réguas de relacionamento automáticas.</p>
        </div>

        <Button onClick={() => setIsCreating(!isCreating)} className="gap-2">
          {isCreating ? <ChevronRight className="h-4 w-4 rotate-180" /> : <Plus className="h-4 w-4" />}
          {isCreating ? "Voltar à Lista" : "Novo Workflow"}
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto p-6 bg-muted/10">
        {isCreating ? (
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Construtor de Automação</h2>
              <Badge variant="outline">Editor Visual</Badge>
            </div>
            <WorkflowBuilder onSave={handleSaveWorkflow} />
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-8">
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
                      <p className="text-sm font-medium text-muted-foreground">Total Execuções (24h)</p>
                      <p className="text-2xl font-bold">1.284</p>
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
                      <p className="text-2xl font-bold text-green-600">98.2%</p>
                    </div>
                    <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                      <AlertCircle className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="lista">
              <TabsList>
                <TabsTrigger value="lista" className="gap-2">
                  <Workflow className="h-4 w-4" /> Todos Workflows
                </TabsTrigger>
                <TabsTrigger value="logs" className="gap-2">
                  <History className="h-4 w-4" /> Logs Recentes
                </TabsTrigger>
              </TabsList>

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
                            <span>{w.execucoes_total} execuções</span>
                            <span className="text-green-600">{w.sucesso_taxa}% sucesso</span>
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
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
}

// Utility to merge classes
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
