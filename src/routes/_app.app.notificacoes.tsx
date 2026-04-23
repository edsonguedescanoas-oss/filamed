import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { 
  MessageCircle, 
  Send, 
  Bell, 
  Phone, 
  ArrowRight, 
  ExternalLink,
  Save,
  Loader2,
  Settings,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { RoleGuard } from "@/components/role-guard";
import { RecursoGate } from "@/components/recurso-gate";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
    template_chamada: "Olá {{nome}}, sua senha {{senha}} foi chamada agora — dirija-se ao {{local}}.",
  });
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [testPhone, setTestPhone] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

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
        template_chamada: c.template_chamada || "Olá {{nome}}, sua senha {{senha}} foi chamada agora — dirija-se ao {{local}}.",
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
      toast.success("Configurações salvas com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestAPI = async () => {
    if (!testPhone) {
      toast.error("Informe um número de telefone para o teste");
      return;
    }
    
    setSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke("wa-duck-notify", {
        body: {
          tipo: "teste",
          telefone: testPhone,
          unidade_id: unidadeId,
          config: config, // Envia o config atual (mesmo que não salvo) para testar
          idempotency_key: crypto.randomUUID()
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Mensagem de teste enviada com sucesso!");
        void fetchLogs();
      } else {
        throw new Error(data?.error || "Erro desconhecido no envio");
      }
    } catch (err: any) {
      console.error("Erro no teste de API:", err);
      toast.error("Falha no teste: " + (err.message || "Erro de conexão"));
    } finally {
      setSendingTest(false);
    }
  };

  if (!unidadeId) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:row-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              Conexão WhatsApp
              <Badge variant="outline" className={cn("ml-2 text-[10px]", config.api_url ? "text-emerald-500 border-emerald-500/20" : "")}>
                {config.api_url ? "Configurado" : "Não configurado"}
              </Badge>
            </CardTitle>
            <CardDescription>
              Dados da API WADuck para habilitar o envio automático.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingConfig ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="api_url">URL da API</Label>
                  <Input
                    id="api_url"
                    placeholder="Ex: https://api.waduck.pro/v1"
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
                  className="w-full gap-2 bg-gradient-primary mt-2"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar Conexão
                </Button>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Teste de API
            </CardTitle>
            <CardDescription>
              Envie uma mensagem de teste para validar sua conexão.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test_phone">Número de Telefone</Label>
              <div className="flex gap-2">
                <Input
                  id="test_phone"
                  placeholder="Ex: 11999999999"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                />
                <Button 
                  onClick={handleTestAPI} 
                  disabled={sendingTest || !config.api_url}
                  className="shrink-0 gap-2"
                >
                  {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Testar
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Dica: O envio de teste gera um log que pode ser visualizado ao lado se houver erro.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Personalizar Mensagem
            </CardTitle>
            <CardDescription>
              Personalize o texto que o paciente receberá.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template_chamada">Template de Chamada</Label>
              <Textarea
                id="template_chamada"
                placeholder="Ex: Olá {{nome}}, sua senha {{senha}} foi chamada..."
                value={config.template_chamada}
                onChange={(e) => setConfig({ ...config, template_chamada: e.target.value })}
                rows={4}
                className="text-sm"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Badge variant="secondary" className="text-[10px] cursor-help" title="Nome do paciente">
                  {"{{nome}}"}
                </Badge>
                <Badge variant="secondary" className="text-[10px] cursor-help" title="Código da senha">
                  {"{{senha}}"}
                </Badge>
                <Badge variant="secondary" className="text-[10px] cursor-help" title="Fila e local de atendimento (ex: Clínica Geral, Consultório 03)">
                  {"{{local}}"}
                </Badge>
              </div>
            </div>
            
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-2">Exemplo de visualização:</p>
              <p className="text-xs italic leading-relaxed">
                "{config.template_chamada
                  .replace("{{nome}}", "João Silva")
                  .replace("{{senha}}", "A-102")
                  .replace("{{local}}", "Clínica Geral, Consultório 03")}"
              </p>
            </div>

            <Button
              className="w-full gap-2"
              variant="outline"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Template
            </Button>
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
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">
                Nenhum envio registrado.
              </p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex flex-col gap-1 text-xs border-b border-border/50 pb-2 last:border-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {log.paciente?.nome_completo || log.destinatario}
                      </p>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(log.created_at).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <Badge 
                        variant={log.status === "enviada" ? "outline" : log.status === "ignorado" ? "secondary" : "destructive"} 
                        className={cn("text-[9px] px-1 h-4", 
                          log.status === "enviada" ? "text-emerald-500 border-emerald-500/20" : 
                          log.status === "ignorado" ? "text-amber-500 border-amber-600/20 dark:border-amber-500/20" : ""
                        )}
                        title={log.erro || undefined}
                      >
                        {log.status === "enviada" ? "sucesso" : log.status === "ignorado" ? "ignorado" : "erro"}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-muted-foreground truncate italic">"{log.mensagem}"</p>
                  {log.erro && (
                    <p className="text-[10px] text-destructive font-mono mt-1 bg-destructive/5 p-1 rounded border border-destructive/10">
                      {log.erro}
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
