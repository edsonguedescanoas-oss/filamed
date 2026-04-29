import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  Users, 
  Settings2, 
  Plus, 
  Play, 
  Calendar,
  MessageSquare,
  Mail,
  ArrowRight
} from "lucide-react";
import CadenceBuilder from "@/components/Operacao/Cadences/CadenceBuilder";
import { CADENCE_TEMPLATES } from "@/lib/cadences/cadenceTemplates";

export const Route = createFileRoute("/operacao/cadences")({
  component: () => <CadenceManagementPage />,
});

function CadenceManagementPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeadsInCadence();
  }, []);

  async function fetchLeadsInCadence() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .not('cadence_id', 'is', null);

      if (error) throw error;
      setLeads(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const getLeadsInCadence = (cadenceId: string) => {
    return leads.filter(l => l.cadence_id === cadenceId);
  };

  return (
    <div className="container mx-auto py-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Cadências</h1>
          <p className="text-muted-foreground">Otimize o follow-up multicanal do seu time comercial.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <BarChart3 className="h-4 w-4" /> Relatórios
          </Button>
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Nova Cadência
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Total em Cadência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leads.length}</div>
            <p className="text-xs text-muted-foreground">Leads ativos agora</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-green-500" /> WhatsApps Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42</div>
            <p className="text-xs text-muted-foreground">+12% que ontem</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-500" /> E-mails Enviados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">128</div>
            <p className="text-xs text-muted-foreground">Taxa de abertura: 34%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Play className="h-4 w-4 text-orange-500" /> Novas Conversões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15</div>
            <p className="text-xs text-muted-foreground">Moveram para Demo</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="builder">Criador de Cadências</TabsTrigger>
          <TabsTrigger value="monitor">Monitoramento de Leads</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CADENCE_TEMPLATES.map((cadence) => (
              <Card key={cadence.id} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary">{cadence.steps.length} etapas</Badge>
                    <Badge variant="outline" className="text-green-600">Ativa</Badge>
                  </div>
                  <CardTitle className="text-xl">{cadence.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{cadence.description}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-xs font-medium border-y py-3">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {getLeadsInCadence(cadence.id).length} Leads
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {cadence.steps[cadence.steps.length-1].day} dias
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Preview do Fluxo</p>
                    <div className="flex items-center gap-2">
                      {cadence.steps.slice(0, 4).map((step, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <div className="h-6 w-6 rounded bg-slate-100 flex items-center justify-center">
                            {step.channel === 'whatsapp' && <MessageSquare className="h-3 w-3 text-green-500" />}
                            {step.channel === 'email' && <Mail className="h-3 w-3 text-blue-500" />}
                            {step.channel === 'ligacao' && <ArrowRight className="h-3 w-3" />}
                          </div>
                          {i < 3 && <span className="text-slate-300">→</span>}
                        </div>
                      ))}
                      {cadence.steps.length > 4 && <span className="text-xs text-muted-foreground">...</span>}
                    </div>
                  </div>

                  <Button variant="outline" className="w-full text-xs">Ver Detalhes e Editar</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="builder">
          <CadenceBuilder />
        </TabsContent>

        <TabsContent value="monitor">
           <Card>
            <CardHeader>
              <CardTitle>Monitoramento de Fluxo em Tempo Real</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left">Lead</th>
                      <th className="px-4 py-3 text-left">Cadência</th>
                      <th className="px-4 py-3 text-left">Etapa Atual</th>
                      <th className="px-4 py-3 text-left">Última Ação</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id} className="border-b hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium">{lead.nome_clinica}</div>
                          <div className="text-xs text-muted-foreground">{lead.nome_contato}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">
                            {CADENCE_TEMPLATES.find(c => c.id === lead.cadence_id)?.name || lead.cadence_id}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs">Dia {lead.cadence_step_atual || 0}</span>
                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-primary w-1/3" />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {lead.ultimo_contato_em ? new Date(lead.ultimo_contato_em).toLocaleDateString() : 'Hoje'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm">Pausar</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
