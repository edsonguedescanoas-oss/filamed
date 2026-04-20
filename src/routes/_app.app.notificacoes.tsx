import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle, Send, Bell, Phone, ArrowRight, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { RoleGuard } from "@/components/role-guard";
import { RecursoGate } from "@/components/recurso-gate";

export const Route = createFileRoute("/_app/app/notificacoes")({
  head: () => ({ meta: [{ title: "Notificações WhatsApp — FilaMed" }] }),
  component: () => (
    <RoleGuard allow={["admin", "recepcao"]} path="/app/notificacoes">
      <NotificacoesPage />
    </RoleGuard>
  ),
});

function NotificacoesPage() {
  const { profile } = useAuth();

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10 space-y-6">
      <header>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <MessageCircle className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">Notificações</h1>
            <p className="text-sm text-muted-foreground">
              Avise pacientes por WhatsApp quando a senha for chamada.
            </p>
          </div>
        </div>
      </header>

      <RecursoGate
        recurso="whatsapp"
        titulo="Notificações por WhatsApp"
        descricao="Avise o paciente automaticamente quando a senha dele estiver próxima ou quando for chamada — direto no WhatsApp dele."
        beneficios={[
          "Reduz no-shows: paciente sai do entorno e volta na hora certa",
          "Mensagens automáticas: chamada, próxima e tempo estimado",
          "Templates personalizáveis por unidade",
          "Histórico completo de envios na auditoria",
        ]}
      >
        <NotificacoesConfig unidadeId={profile?.unidade_id ?? null} />
      </RecursoGate>
    </div>
  );
}

function NotificacoesConfig({ unidadeId }: { unidadeId: string | null }) {
  if (!unidadeId) return null;
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Conexão WhatsApp
            <Badge variant="outline" className="ml-2 text-[10px]">
              Não conectado
            </Badge>
          </CardTitle>
          <CardDescription>
            Conecte um número de WhatsApp Business para começar a enviar notificações automáticas
            para os pacientes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
            <Bell className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-3 text-sm font-medium">Nenhum número conectado ainda</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Conecte via WhatsApp Business API (Meta) ou via gateway parceiro.
            </p>
            <Button className="mt-4" asChild>
              <a
                href="mailto:contato@filamed.app?subject=Conectar%20WhatsApp"
                rel="noopener"
              >
                Falar com suporte para conectar
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Templates de mensagem
          </CardTitle>
          <CardDescription>
            Pré-visualize as mensagens que serão enviadas. Edição completa em breve.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <TemplatePreview
            titulo="Próxima senha"
            evento="Faltam 2 senhas para o paciente"
            mensagem="Olá {{nome}}, sua senha {{codigo}} está próxima — faltam 2 pacientes na sua frente. Volte para a recepção em até 5 minutos."
          />
          <TemplatePreview
            titulo="Chamada"
            evento="Quando a senha é chamada"
            mensagem="Olá {{nome}}, sua senha {{codigo}} foi chamada agora — dirija-se ao(à) {{destino}}."
          />
          <TemplatePreview
            titulo="Ausência"
            evento="Após 5 min sem comparecer"
            mensagem="Olá {{nome}}, sua senha {{codigo}} foi marcada como ausente. Procure a recepção para reagendar."
          />
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Veja o histórico de envios</p>
            <p className="text-sm text-muted-foreground">
              Todas as mensagens enviadas ficam registradas para auditoria.
            </p>
          </div>
          <Button variant="outline" disabled>
            Ver auditoria
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Precisa de ajuda?{" "}
        <Link to="/app/conta" className="underline hover:text-foreground">
          Ver detalhes do meu plano
        </Link>
      </p>
    </div>
  );
}

function TemplatePreview({
  titulo,
  evento,
  mensagem,
}: {
  titulo: string;
  evento: string;
  mensagem: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{titulo}</p>
          <p className="text-xs text-muted-foreground">{evento}</p>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          Ativo
        </Badge>
      </div>
      <div className="mt-3 rounded-md bg-emerald-500/5 border border-emerald-500/20 px-3 py-2 text-sm">
        {mensagem}
      </div>
    </div>
  );
}
