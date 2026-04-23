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
  const [config, setConfig] = useState({
    api_url: "",
    api_key: "",
    instance_id: "",
  });
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const fetchConfig = async () => {
    if (!unidadeId) return;
    setLoadingConfig(true);
    const { data, error } = await supabase
      .from("unidades")
      .select("whatsapp_config")
      .eq("id", unidadeId)
      .single();

    if (!error && data?.whatsapp_config) {
      const c = data.whatsapp_config as any;
      setConfig({
        api_url: c.api_url || "",
        api_key: c.api_key || "",
        instance_id: c.instance_id || "",
      });
    }
    setLoadingConfig(false);
  };

  const fetchLogs = async () => {
    if (!unidadeId) return;
    setLoadingLogs(true);
    const { data, error } = await supabase
      .from("notificacoes_log")
      .select("*, paciente:pacientes(nome_completo), senha:senhas(codigo)")
      .eq("unidade_id", unidadeId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error) setLogs(data || []);
    setLoadingLogs(false);
  };

  useEffect(() => {
    void fetchConfig();
    void fetchLogs();
  }, [unidadeId]);

  const handleSave = async () => {
    if (!unidadeId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("unidades")
        .update({ whatsapp_config: config })
        .eq("id", unidadeId);
      if (error) throw error;
      toast.success("Configuração do WADuck salva!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!unidadeId) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Configuração WADuck
            <Badge variant="outline" className={cn("ml-2 text-[10px]", config.api_url ? "text-emerald-500 border-emerald-500/20" : "")}>
              {config.api_url ? "Configurado" : "Não configurado"}
            </Badge>
          </CardTitle>
          <CardDescription>
            Insira os dados da sua API WADuck para habilitar o envio automático de senhas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingConfig ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="api_url">URL da API</Label>
                  <Input
                    id="api_url"
                    placeholder="https://api.waduck.com.br"
                    value={config.api_url}
                    onChange={(e) => setConfig({ ...config, api_url: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instance_id">ID da Instância</Label>
                  <Input
                    id="instance_id"
                    placeholder="Sua instância"
                    value={config.instance_id}
                    onChange={(e) => setConfig({ ...config, instance_id: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="api_key">Token (API Key)</Label>
                <Input
                  id="api_key"
                  type="password"
                  placeholder="Seu token WADuck"
                  value={config.api_key}
                  onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                />
              </div>
              <Button
                className="w-full gap-2 bg-gradient-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar Configurações
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Send className="h-5 w-5 text-primary" />
              Templates Automáticos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <TemplatePreview
              titulo="Senha Gerada"
              evento="Enviado assim que o paciente recebe a senha"
              mensagem="Olá {{nome}}, sua senha no estabelecimento é {{codigo}}. Tempo estimado: {{tempo}} min."
            />
            <TemplatePreview
              titulo="Chamada (Em breve)"
              evento="Quando a senha é chamada no painel"
              mensagem="Olá {{nome}}, sua senha {{codigo}} foi chamada agora — dirija-se ao local indicado."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5 text-primary" />
              Últimos Envios
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loadingLogs ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-10">
                Nenhum envio registrado.
              </p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between gap-3 text-xs border-b border-border/50 pb-2 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{log.paciente?.nome_completo}</p>
                    <p className="text-muted-foreground truncate">{log.mensagem}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant={log.status === "sucesso" ? "outline" : "destructive"} className="text-[9px] px-1 h-4">
                      {log.status}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(log.created_at).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
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
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{titulo}</p>
          <p className="text-[10px] text-muted-foreground">{evento}</p>
        </div>
        <Badge variant="secondary" className="text-[9px] h-4">
          Ativo
        </Badge>
      </div>
      <div className="mt-2 rounded-md border border-primary/20 bg-primary/5 px-2 py-1.5 text-[11px] leading-relaxed italic">
        "{mensagem}"
      </div>
    </div>
  );
}
