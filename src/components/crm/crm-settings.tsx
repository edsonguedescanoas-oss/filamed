import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, Save, RefreshCw, Smartphone, Globe, CheckCircle2, AlertCircle, Clock, Check } from "lucide-react";

export function CRMSettings() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    waduk_api_key: "",
    waduk_instance_id: "",
    whatsapp_number: "",
  });
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [checkingLogs, setCheckingLogs] = useState(false);

  useEffect(() => {
    loadConfig();
    setWebhookUrl(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/waduk-webhook`);
    fetchLogs();

    // Listener para logs em tempo real
    const channel = supabase
      .channel('waduk_logs_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'waduk_webhook_logs' },
        () => fetchLogs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLogs = async () => {
    setCheckingLogs(true);
    try {
      const { data } = await supabase
        .from("waduk_webhook_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      setWebhookLogs(data || []);
    } catch (err) {
      console.error("Erro ao buscar logs:", err);
    } finally {
      setCheckingLogs(false);
    }
  };

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("crm_config")
        .select("*")
        .eq("key", "waduk_settings")
        .maybeSingle();

      if (data && data.value) {
        setConfig(data.value as any);
      }
    } catch (error) {
      console.error("Erro ao carregar config:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("crm_config")
        .upsert({
          key: "waduk_settings",
          value: config,
          updated_at: new Date().toISOString()
        }, { onConflict: "key" });

      if (error) throw error;
      toast.success("Configurações salvas com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao salvar configurações: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Configuração do WhatsApp (WADUK)
          </CardTitle>
          <CardDescription>
            Configure as credenciais da sua conta WADUK para enviar e receber mensagens.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="api_key">API Key</Label>
            <Input 
              id="api_key" 
              type="password"
              placeholder="Sua API Key do WADUK" 
              value={config.waduk_api_key}
              onChange={(e) => setConfig({ ...config, waduk_api_key: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="instance_id">Instance ID</Label>
            <Input 
              id="instance_id" 
              placeholder="Ex: 3B9C..." 
              value={config.waduk_instance_id}
              onChange={(e) => setConfig({ ...config, waduk_instance_id: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="number">Número do WhatsApp (com DDI)</Label>
            <Input 
              id="number" 
              placeholder="Ex: 5511999999999" 
              value={config.whatsapp_number}
              onChange={(e) => setConfig({ ...config, whatsapp_number: e.target.value })}
            />
          </div>
          <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto">
            {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Configuração de Webhook
          </CardTitle>
          <CardDescription>
            Copie esta URL e cole no campo de webhook/callback da instância do WhatsApp no painel WADUK.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input readOnly value={webhookUrl} className="font-mono text-xs bg-muted" />
            <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookUrl)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          <div className="rounded-lg border bg-muted/40 p-4 text-sm">
            <p className="mb-3 font-semibold">Onde colocar no WADUK</p>
            <ol className="space-y-2 text-muted-foreground">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Abra a instância conectada ao número configurado acima.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Entre em <strong className="text-foreground">Configurações / Webhook / Callback URL</strong>.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Cole a URL acima e habilite eventos de mensagem recebida, como <strong className="text-foreground">message.received</strong> ou <strong className="text-foreground">messages.upsert</strong>.
              </li>
            </ol>
          </div>

          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-foreground">
            <p className="font-semibold mb-1">Se ainda não chegar mensagem:</p>
            <p>o WADUK ainda não está chamando esta URL. Depois de salvar o webhook no WADUK, envie uma mensagem nova para o número conectado.</p>
          </div>

          <div className="pt-4 border-t space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                Checklist de Integração
                {checkingLogs && <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />}
              </h4>
              <Button variant="ghost" size="sm" onClick={fetchLogs} className="h-8 text-xs">
                Atualizar Status
              </Button>
            </div>

            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <div className={`mt-0.5 p-1 rounded-full ${webhookLogs.length > 0 ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                  {webhookLogs.length > 0 ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                </div>
                <div>
                  <p className="text-sm font-medium">Recebimento de Dados</p>
                  <p className="text-xs text-muted-foreground">
                    {webhookLogs.length > 0 
                      ? "O sistema já recebeu sinais do WADUK." 
                      : "Aguardando primeira chamada do WADUK. Verifique se a URL está correta no painel."}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <div className={`mt-0.5 p-1 rounded-full ${webhookLogs.some(l => l.event_type === 'message.received' || l.event_type === 'messages.upsert') ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                  {webhookLogs.some(l => l.event_type === 'message.received' || l.event_type === 'messages.upsert') ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                </div>
                <div>
                  <p className="text-sm font-medium">Eventos de Mensagem</p>
                  <p className="text-xs text-muted-foreground">
                    {webhookLogs.some(l => l.event_type === 'message.received' || l.event_type === 'messages.upsert')
                      ? "Eventos de mensagem detectados com sucesso."
                      : "Nenhum evento 'message.received' ou 'messages.upsert' detectado. Habilite-os no painel WADUK."}
                  </p>
                </div>
              </div>

              {webhookLogs.length > 0 && (
                <div className="mt-2">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Últimos Eventos</p>
                  <div className="space-y-1">
                    {webhookLogs.slice(0, 3).map((log) => (
                      <div key={log.id} className="flex items-center justify-between text-[11px] p-1.5 rounded bg-muted/50 border border-transparent hover:border-border transition-colors">
                        <span className="font-mono text-primary">{log.event_type}</span>
                        <span className="text-muted-foreground">{new Date(log.created_at).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
