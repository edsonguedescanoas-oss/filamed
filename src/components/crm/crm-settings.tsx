import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, Save, RefreshCw, Smartphone, Globe, CheckCircle2 } from "lucide-react";

export function CRMSettings() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    waduk_api_key: "",
    waduk_instance_id: "",
    whatsapp_number: "",
  });
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => {
    loadConfig();
    setWebhookUrl(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/waduk-webhook`);
  }, []);

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
        </CardContent>
      </Card>
    </div>
  );
}
