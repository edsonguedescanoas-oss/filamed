import { useEffect, useState } from "react";
import { Loader2, Save, Plus, Trash2, FlaskConical, BarChart3, Crown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Variante = { key: string; ativo: boolean; texto: string };
type TipoVariante = "chamada" | "encaminhamento" | "finalizacao";

type VariantesConfig = Partial<Record<TipoVariante, Variante[]>>;

type StatRow = {
  tipo: string;
  variant_key: string;
  enviadas: number;
  cliques: number;
  ctr_percent: number;
  ultimo_envio: string | null;
};

const TIPOS: { id: TipoVariante; label: string; placeholders: string[]; defaultText: string }[] = [
  {
    id: "chamada",
    label: "Chamada",
    placeholders: ["{{primeiro_nome}}", "{{nome}}", "{{senha}}", "{{local}}", "{{unidade}}", "{{link}}"],
    defaultText:
      "Olá {{primeiro_nome}}! 🔔 Sua senha *{{senha}}* foi chamada.\n\n👉 Dirija-se ao *{{local}}*.",
  },
  {
    id: "encaminhamento",
    label: "Encaminhamento",
    placeholders: ["{{primeiro_nome}}", "{{nome}}", "{{senha}}", "{{fila}}", "{{unidade}}", "{{link}}"],
    defaultText:
      "Olá *{{primeiro_nome}}*, sua senha foi atualizada!\n\n🎫 Nova senha: *{{senha}}*\n📍 Fila: *{{fila}}*\n\n👉 Acompanhe em tempo real:\n{{link}}",
  },
  {
    id: "finalizacao",
    label: "Finalização",
    placeholders: ["{{primeiro_nome}}", "{{nome}}", "{{unidade}}", "{{link_avaliacao}}"],
    defaultText:
      "Obrigado pela visita ao *{{unidade}}*, {{primeiro_nome}}! 💙\n\n⭐ Sua opinião faz a diferença — avalie em 1 minuto:\n{{link_avaliacao}}",
  },
];

function novaVariante(key: string, defaultText: string): Variante {
  return { key, ativo: true, texto: defaultText };
}

export function WhatsappVariantesEditor({ unidadeId }: { unidadeId: string | null }) {
  const [variantes, setVariantes] = useState<VariantesConfig>({});
  const [stats, setStats] = useState<StatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    if (!unidadeId) return;
    setLoading(true);
    const [{ data: u }, { data: s }] = await Promise.all([
      supabase.from("unidades").select("whatsapp_config").eq("id", unidadeId).maybeSingle(),
      (
        supabase
          .from("notificacoes_variantes_stats" as never)
          .select("*")
          .eq("unidade_id", unidadeId) as unknown as Promise<{ data: StatRow[] | null }>
      ),
    ]);
    const cfg = (u?.whatsapp_config ?? {}) as { variantes?: VariantesConfig };
    setVariantes(cfg.variantes ?? {});
    setStats(s ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void fetchData();
  }, [unidadeId]);

  const setLista = (tipo: TipoVariante, lista: Variante[]) => {
    setVariantes((prev) => ({ ...prev, [tipo]: lista }));
  };

  const handleAdd = (tipo: TipoVariante) => {
    const def = TIPOS.find((t) => t.id === tipo)!;
    const atual = variantes[tipo] ?? [];
    if (atual.length >= 3) {
      toast.info("Máximo de 3 variações por tipo.");
      return;
    }
    const usadas = new Set(atual.map((v) => v.key));
    const candidatos = ["a", "b", "c"];
    const key = candidatos.find((k) => !usadas.has(k)) ?? `v${atual.length + 1}`;
    setLista(tipo, [...atual, novaVariante(key, def.defaultText)]);
  };

  const handleRemove = (tipo: TipoVariante, idx: number) => {
    const atual = variantes[tipo] ?? [];
    setLista(
      tipo,
      atual.filter((_, i) => i !== idx),
    );
  };

  const handleUpdate = (tipo: TipoVariante, idx: number, patch: Partial<Variante>) => {
    const atual = variantes[tipo] ?? [];
    setLista(
      tipo,
      atual.map((v, i) => (i === idx ? { ...v, ...patch } : v)),
    );
  };

  const handleSave = async () => {
    if (!unidadeId) return;
    setSaving(true);
    try {
      // Mescla com whatsapp_config existente (não sobrescrever api_url, api_key, etc.)
      const { data } = await supabase
        .from("unidades")
        .select("whatsapp_config")
        .eq("id", unidadeId)
        .maybeSingle();
      const atual = (data?.whatsapp_config ?? {}) as Record<string, unknown>;
      const novo = { ...atual, variantes };
      const { error } = await supabase
        .from("unidades")
        .update({ whatsapp_config: novo } as never)
        .eq("id", unidadeId);
      if (error) throw error;
      toast.success("Variações salvas! Próximos envios já alternam aleatoriamente.");
      void fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao salvar: " + msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              Teste A/B de Mensagens
            </CardTitle>
            <CardDescription>
              Configure 2-3 variações por tipo. O sistema escolhe uma aleatoriamente a cada envio
              e mede qual gera mais cliques no link.
            </CardDescription>
          </div>
          <Button onClick={() => void handleSave()} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar variações
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="chamada" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {TIPOS.map((t) => (
              <TabsTrigger key={t.id} value={t.id}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {TIPOS.map((t) => {
            const lista = variantes[t.id] ?? [];
            const statsTipo = stats.filter((s) => s.tipo === t.id);
            return (
              <TabsContent key={t.id} value={t.id} className="space-y-4 pt-4">
                <ComparacaoVariantes statsTipo={statsTipo} tipo={t.id} />

                {lista.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-3">
                      Nenhuma variação criada. Sem variações, o sistema usa o template padrão.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => handleAdd(t.id)}>
                      <Plus className="h-4 w-4" /> Criar primeira variação
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lista.map((v, idx) => (
                      <VarianteCard
                        key={idx}
                        variante={v}
                        index={idx}
                        placeholders={t.placeholders}
                        onUpdate={(patch) => handleUpdate(t.id, idx, patch)}
                        onRemove={() => handleRemove(t.id, idx)}
                      />
                    ))}
                    {lista.length < 3 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAdd(t.id)}
                        className="w-full gap-2"
                      >
                        <Plus className="h-4 w-4" /> Adicionar variação ({lista.length}/3)
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function VarianteCard({
  variante,
  index,
  placeholders,
  onUpdate,
  onRemove,
}: {
  variante: Variante;
  index: number;
  placeholders: string[];
  onUpdate: (patch: Partial<Variante>) => void;
  onRemove: () => void;
}) {
  const cores = ["bg-blue-500/10 text-blue-600", "bg-emerald-500/10 text-emerald-600", "bg-amber-500/10 text-amber-600"];
  return (
    <div
      className={cn(
        "rounded-lg border p-3 space-y-3",
        variante.ativo ? "border-border" : "border-border/40 bg-muted/30",
      )}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge className={cn("uppercase text-[10px] font-bold", cores[index % cores.length])}>
            Variação {variante.key.toUpperCase()}
          </Badge>
          <div className="flex items-center gap-2">
            <Switch
              checked={variante.ativo}
              onCheckedChange={(checked) => onUpdate({ ativo: checked })}
              id={`ativo-${variante.key}`}
            />
            <Label htmlFor={`ativo-${variante.key}`} className="text-xs cursor-pointer">
              {variante.ativo ? "Ativa no sorteio" : "Pausada"}
            </Label>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={onRemove} className="text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Identificador</Label>
        <Input
          value={variante.key}
          onChange={(e) => onUpdate({ key: e.target.value.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 8) || "a" })}
          className="h-8 text-sm max-w-[120px]"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Texto da mensagem</Label>
        <Textarea
          value={variante.texto}
          onChange={(e) => onUpdate({ texto: e.target.value })}
          rows={5}
          className="text-sm"
        />
        <div className="flex flex-wrap gap-1.5">
          {placeholders.map((p) => (
            <Badge
              key={p}
              variant="secondary"
              className="text-[10px] cursor-pointer hover:bg-secondary/80"
              onClick={() => onUpdate({ texto: variante.texto + " " + p })}
            >
              {p}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function ComparacaoVariantes({ statsTipo, tipo }: { statsTipo: StatRow[]; tipo: string }) {
  if (statsTipo.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <BarChart3 className="h-4 w-4 inline mr-1" />
        Sem dados ainda. As estatísticas aparecem após os primeiros envios.
      </div>
    );
  }
  // Vencedor = maior CTR com pelo menos 5 envios
  const candidatos = statsTipo.filter((s) => s.enviadas >= 5);
  const vencedor =
    candidatos.length > 1
      ? candidatos.reduce((acc, s) => (s.ctr_percent > acc.ctr_percent ? s : acc))
      : null;

  const totalEnviadas = statsTipo.reduce((acc, s) => acc + Number(s.enviadas), 0);
  const totalCliques = statsTipo.reduce((acc, s) => acc + Number(s.cliques), 0);

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <BarChart3 className="h-4 w-4 text-primary" />
        <span className="font-semibold uppercase tracking-wider text-primary">
          Desempenho ({totalEnviadas} envios · {totalCliques} cliques)
        </span>
      </div>
      <div className="space-y-1.5">
        {statsTipo
          .sort((a, b) => Number(b.ctr_percent) - Number(a.ctr_percent))
          .map((s) => {
            const isVencedor = vencedor && s.variant_key === vencedor.variant_key;
            const labelKey = s.variant_key.startsWith(`${tipo}_`)
              ? s.variant_key.slice(tipo.length + 1).toUpperCase()
              : s.variant_key.toUpperCase();
            return (
              <div
                key={s.variant_key}
                className={cn(
                  "flex items-center gap-3 rounded-md px-2 py-1.5 text-xs",
                  isVencedor ? "bg-emerald-500/10" : "bg-background",
                )}
              >
                <Badge variant="outline" className="font-mono text-[10px]">
                  {labelKey}
                </Badge>
                {isVencedor && <Crown className="h-3 w-3 text-emerald-600" />}
                <span className="flex-1 text-muted-foreground">
                  {s.enviadas} envios · {s.cliques} cliques
                </span>
                <span className="font-bold tabular-nums">{Number(s.ctr_percent).toFixed(1)}%</span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
