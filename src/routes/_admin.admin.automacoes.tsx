import { createFileRoute } from "@tanstack/react-router";
import { Zap, Bell, MessageSquare, Clock, ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_admin/admin/automacoes")({
  component: AutomacoesPage,
});

function AutomacoesPage() {
  const workflows = [
    {
      id: 1,
      name: "Alerta de Fila Longa",
      description: "Notifica o gestor quando uma fila ultrapassa 10 pessoas.",
      status: "Ativo",
      trigger: "Fila > 10",
      action: "WhatsApp Gestor",
    },
    {
      id: 2,
      name: "Confirmação de Agendamento",
      description: "Envia lembrete 2h antes do atendimento.",
      status: "Ativo",
      trigger: "T-2h",
      action: "WhatsApp Paciente",
    },
    {
      id: 3,
      name: "Pesquisa de Satisfação",
      description: "Envia link de pesquisa 1h após o atendimento.",
      status: "Inativo",
      trigger: "Atendimento Finalizado",
      action: "WhatsApp Paciente",
    },
  ];

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automações</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie fluxos automáticos e gatilhos de notificação.
          </p>
        </div>
        <Button className="bg-gradient-primary gap-2">
          <Plus className="h-4 w-4" />
          Nova Automação
        </Button>
      </div>

      <div className="grid gap-6">
        {workflows.map((wf) => (
          <Card key={wf.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{wf.name}</CardTitle>
                    <CardDescription>{wf.description}</CardDescription>
                  </div>
                </div>
                <Badge variant={wf.status === "Ativo" ? "default" : "secondary"}>
                  {wf.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Gatilho:</span>
                  <span className="text-muted-foreground">{wf.trigger}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Ação:</span>
                  <span className="text-muted-foreground">{wf.action}</span>
                </div>
                <div className="ml-auto flex gap-2">
                  <Button variant="outline" size="sm">Editar</Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">Pausar</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12">
        <h2 className="text-xl font-semibold mb-4">Modelos Prontos</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Boas-vindas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Dê boas-vindas ao paciente assim que ele entrar na fila.
              </p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Alerta de Ociosidade</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Notifica se nenhum paciente for chamado em 15 minutos.
              </p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Feedback Negativo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Alerta o gestor se uma avaliação for menor que 3 estrelas.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
