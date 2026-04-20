import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Package,
  Plus,
  Pencil,
  Trash2,
  Star,
  StarOff,
  Eye,
  EyeOff,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_admin/admin/planos")({
  head: () => ({
    meta: [{ title: "Admin · Planos — FilaMed" }],
  }),
  component: AdminPlanosPage,
});

interface PlanoRow {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  preco_mensal_centavos: number;
  preco_anual_centavos: number | null;
  moeda: string;
  limite_filas: number | null;
  limite_atendentes: number | null;
  limite_tvs: number | null;
  limite_senhas_mes: number | null;
  recursos: Record<string, boolean> | null;
  ativo: boolean;
  destaque: boolean;
  ordem: number;
  gateway_price_id_mensal: string | null;
  gateway_price_id_anual: string | null;
  gateway_price_id_anual_oneoff: string | null;
}

// Toggles de recursos conhecidos (mantém alinhado com /precos)
const RECURSOS_DISPONIVEIS: { key: string; label: string }[] = [
  { key: "whatsapp", label: "Notificações WhatsApp" },
  { key: "voz_premium", label: "Voz premium (ElevenLabs/Google)" },
  { key: "relatorios_avancados", label: "Relatórios avançados" },
  { key: "multi_unidade", label: "Multi-unidade" },
  { key: "suporte_prioritario", label: "Suporte prioritário 24/7" },
  { key: "sso", label: "Login único (SSO)" },
  { key: "api", label: "API REST + Webhooks" },
];

interface FormState {
  slug: string;
  nome: string;
  descricao: string;
  preco_mensal_reais: string; // input em reais
  preco_anual_reais: string;
  moeda: string;
  limite_filas: string; // vazio = ilimitado
  limite_atendentes: string;
  limite_tvs: string;
  limite_senhas_mes: string;
  recursos: Record<string, boolean>;
  ativo: boolean;
  destaque: boolean;
  ordem: string;
  gateway_price_id_mensal: string;
  gateway_price_id_anual: string;
  gateway_price_id_anual_oneoff: string;
}

function emptyForm(): FormState {
  const recursos: Record<string, boolean> = {};
  for (const r of RECURSOS_DISPONIVEIS) recursos[r.key] = false;
  return {
    slug: "",
    nome: "",
    descricao: "",
    preco_mensal_reais: "",
    preco_anual_reais: "",
    moeda: "BRL",
    limite_filas: "",
    limite_atendentes: "",
    limite_tvs: "",
    limite_senhas_mes: "",
    recursos,
    ativo: true,
    destaque: false,
    ordem: "0",
    gateway_price_id_mensal: "",
    gateway_price_id_anual: "",
    gateway_price_id_anual_oneoff: "",
  };
}

function planoToForm(p: PlanoRow): FormState {
  const recursos: Record<string, boolean> = {};
  for (const r of RECURSOS_DISPONIVEIS) recursos[r.key] = Boolean(p.recursos?.[r.key]);
  // Mantém recursos extras que existirem além dos conhecidos
  if (p.recursos) {
    for (const [k, v] of Object.entries(p.recursos)) {
      if (!(k in recursos)) recursos[k] = Boolean(v);
    }
  }
  return {
    slug: p.slug,
    nome: p.nome,
    descricao: p.descricao ?? "",
    preco_mensal_reais: (p.preco_mensal_centavos / 100).toFixed(2).replace(".", ","),
    preco_anual_reais:
      p.preco_anual_centavos != null
        ? (p.preco_anual_centavos / 100).toFixed(2).replace(".", ",")
        : "",
    moeda: p.moeda,
    limite_filas: p.limite_filas?.toString() ?? "",
    limite_atendentes: p.limite_atendentes?.toString() ?? "",
    limite_tvs: p.limite_tvs?.toString() ?? "",
    limite_senhas_mes: p.limite_senhas_mes?.toString() ?? "",
    recursos,
    ativo: p.ativo,
    destaque: p.destaque,
    ordem: p.ordem.toString(),
    gateway_price_id_mensal: p.gateway_price_id_mensal ?? "",
    gateway_price_id_anual: p.gateway_price_id_anual ?? "",
    gateway_price_id_anual_oneoff: p.gateway_price_id_anual_oneoff ?? "",
  };
}

function parseReais(v: string): number | null {
  const trimmed = v.trim().replace(/\./g, "").replace(",", ".");
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function parseLimite(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

function fmtMoeda(centavos: number, moeda = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: moeda,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(centavos / 100);
}

function AdminPlanosPage() {
  const [planos, setPlanos] = useState<PlanoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PlanoRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PlanoRow | null>(null);

  async function reload() {
    setLoading(true);
    const { data, error } = await supabase
      .from("planos")
      .select(
        "id, slug, nome, descricao, preco_mensal_centavos, preco_anual_centavos, moeda, limite_filas, limite_atendentes, limite_tvs, limite_senhas_mes, recursos, ativo, destaque, ordem, gateway_price_id_mensal, gateway_price_id_anual, gateway_price_id_anual_oneoff",
      )
      .order("ordem", { ascending: true });
    if (error) {
      toast.error("Erro ao carregar planos: " + error.message);
    } else {
      setPlanos((data ?? []) as PlanoRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    void reload();
  }, []);

  async function toggleField(p: PlanoRow, field: "ativo" | "destaque", value: boolean) {
    const patch = { [field]: value } as { ativo?: boolean; destaque?: boolean };
    const { error } = await supabase.from("planos").update(patch).eq("id", p.id);
    if (error) {
      toast.error("Falha ao atualizar: " + error.message);
      return;
    }
    setPlanos((prev) => prev.map((x) => (x.id === p.id ? { ...x, [field]: value } : x)));
    toast.success("Plano atualizado");
  }

  async function deletePlano(p: PlanoRow) {
    const { error } = await supabase.from("planos").delete().eq("id", p.id);
    if (error) {
      toast.error("Falha ao remover: " + error.message);
      return;
    }
    toast.success(`Plano "${p.nome}" removido`);
    setConfirmDelete(null);
    void reload();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Planos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie os planos de assinatura, preços, limites e recursos.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Novo plano
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Lista de planos
          </CardTitle>
          <CardDescription>
            {planos.length} {planos.length === 1 ? "plano cadastrado" : "planos cadastrados"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : planos.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhum plano cadastrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plano</TableHead>
                    <TableHead>Mensal</TableHead>
                    <TableHead>Anual</TableHead>
                    <TableHead>Limites</TableHead>
                    <TableHead>Recursos</TableHead>
                    <TableHead>Stripe Price IDs</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planos.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{p.nome}</div>
                          {p.destaque && (
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                              Destaque
                            </Badge>
                          )}
                          {!p.ativo && (
                            <Badge variant="outline" className="bg-muted text-muted-foreground">
                              Inativo
                            </Badge>
                          )}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">{p.slug}</div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {fmtMoeda(p.preco_mensal_centavos, p.moeda)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {p.preco_anual_centavos
                          ? fmtMoeda(p.preco_anual_centavos, p.moeda)
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div>{p.limite_filas ?? "∞"} filas · {p.limite_atendentes ?? "∞"} atendentes</div>
                        <div>{p.limite_tvs ?? "∞"} TVs · {p.limite_senhas_mes?.toLocaleString("pt-BR") ?? "∞"} senhas/mês</div>
                      </TableCell>
                      <TableCell>
                        <RecursosBadges recursos={p.recursos} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            title={p.destaque ? "Remover destaque" : "Marcar como destaque"}
                            onClick={() => void toggleField(p, "destaque", !p.destaque)}
                          >
                            {p.destaque ? <StarOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title={p.ativo ? "Desativar" : "Ativar"}
                            onClick={() => void toggleField(p, "ativo", !p.ativo)}
                          >
                            {p.ativo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Editar"
                            onClick={() => setEditing(p)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Remover"
                            onClick={() => setConfirmDelete(p)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editor */}
      <PlanoEditorDialog
        open={creating || editing !== null}
        plano={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={() => {
          setCreating(false);
          setEditing(null);
          void reload();
        }}
      />

      {/* Confirmação de remoção */}
      <AlertDialog open={confirmDelete !== null} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover plano?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Se houver assinaturas vinculadas a{" "}
              <strong>{confirmDelete?.nome}</strong>, a remoção pode falhar.
              Considere apenas desativar o plano.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDelete && void deletePlano(confirmDelete)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RecursosBadges({ recursos }: { recursos: Record<string, boolean> | null }) {
  if (!recursos) return <span className="text-xs text-muted-foreground">—</span>;
  const ativos = Object.entries(recursos).filter(([, v]) => v);
  if (ativos.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {ativos.slice(0, 3).map(([k]) => (
        <Badge key={k} variant="outline" className="text-[10px]">
          {RECURSOS_DISPONIVEIS.find((r) => r.key === k)?.label ?? k}
        </Badge>
      ))}
      {ativos.length > 3 && (
        <span className="text-[10px] text-muted-foreground">+{ativos.length - 3}</span>
      )}
    </div>
  );
}

function PlanoEditorDialog({
  open,
  plano,
  onClose,
  onSaved,
}: {
  open: boolean;
  plano: PlanoRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = plano !== null;
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(plano ? planoToForm(plano) : emptyForm());
    }
  }, [open, plano]);

  const recursosExtras = useMemo(
    () => Object.keys(form.recursos).filter((k) => !RECURSOS_DISPONIVEIS.some((r) => r.key === k)),
    [form.recursos],
  );

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function toggleRecurso(key: string, value: boolean) {
    setForm((p) => ({ ...p, recursos: { ...p.recursos, [key]: value } }));
  }

  async function handleSave() {
    if (!form.nome.trim()) return toast.error("Nome é obrigatório");
    if (!form.slug.trim()) return toast.error("Slug é obrigatório");
    const precoMensal = parseReais(form.preco_mensal_reais);
    if (precoMensal === null) return toast.error("Preço mensal inválido");
    const precoAnual = form.preco_anual_reais.trim() ? parseReais(form.preco_anual_reais) : null;
    if (form.preco_anual_reais.trim() && precoAnual === null)
      return toast.error("Preço anual inválido");

    const ordem = parseLimite(form.ordem) ?? 0;

    const payload = {
      slug: form.slug.trim(),
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      preco_mensal_centavos: precoMensal,
      preco_anual_centavos: precoAnual,
      moeda: form.moeda.trim() || "BRL",
      limite_filas: parseLimite(form.limite_filas),
      limite_atendentes: parseLimite(form.limite_atendentes),
      limite_tvs: parseLimite(form.limite_tvs),
      limite_senhas_mes: parseLimite(form.limite_senhas_mes),
      recursos: form.recursos,
      ativo: form.ativo,
      destaque: form.destaque,
      ordem,
    };

    setSaving(true);
    try {
      if (isEdit && plano) {
        const { error } = await supabase.from("planos").update(payload).eq("id", plano.id);
        if (error) throw error;
        toast.success("Plano atualizado");
      } else {
        const { error } = await supabase.from("planos").insert(payload);
        if (error) throw error;
        toast.success("Plano criado");
      }
      onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "erro desconhecido";
      toast.error("Falha ao salvar: " + msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Editar ${plano?.nome}` : "Novo plano"}</DialogTitle>
          <DialogDescription>
            Configure preços, limites e recursos disponíveis no plano.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          {/* Identificação */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => setField("nome", e.target.value)}
                placeholder="Pro"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => setField("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                placeholder="pro"
                disabled={isEdit}
              />
              {isEdit && (
                <p className="text-[11px] text-muted-foreground">
                  Slug não pode ser alterado após criação.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={form.descricao}
              onChange={(e) => setField("descricao", e.target.value)}
              placeholder="Para clínicas que querem reduzir filas e profissionalizar o atendimento."
              rows={2}
            />
          </div>

          {/* Preços */}
          <div className="rounded-lg border border-border p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-sm">Preços (R$)</h3>
              <div className="flex items-center gap-2">
                <Label htmlFor="moeda" className="text-xs text-muted-foreground">Moeda</Label>
                <Input
                  id="moeda"
                  value={form.moeda}
                  onChange={(e) => setField("moeda", e.target.value.toUpperCase())}
                  className="h-8 w-20"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="preco_mensal">Mensal</Label>
                <Input
                  id="preco_mensal"
                  value={form.preco_mensal_reais}
                  onChange={(e) => setField("preco_mensal_reais", e.target.value)}
                  placeholder="249,00"
                  inputMode="decimal"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="preco_anual">Anual (vazio se não houver)</Label>
                <Input
                  id="preco_anual"
                  value={form.preco_anual_reais}
                  onChange={(e) => setField("preco_anual_reais", e.target.value)}
                  placeholder="2490,00"
                  inputMode="decimal"
                />
              </div>
            </div>
          </div>

          {/* Limites */}
          <div className="rounded-lg border border-border p-4">
            <h3 className="mb-1 font-semibold text-sm">Limites</h3>
            <p className="mb-3 text-[11px] text-muted-foreground">
              Deixe em branco para “ilimitado”. Limites são informativos (soft limit).
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <LimiteField
                label="Filas"
                value={form.limite_filas}
                onChange={(v) => setField("limite_filas", v)}
              />
              <LimiteField
                label="Atendentes"
                value={form.limite_atendentes}
                onChange={(v) => setField("limite_atendentes", v)}
              />
              <LimiteField
                label="TVs (painéis)"
                value={form.limite_tvs}
                onChange={(v) => setField("limite_tvs", v)}
              />
              <LimiteField
                label="Senhas / mês"
                value={form.limite_senhas_mes}
                onChange={(v) => setField("limite_senhas_mes", v)}
              />
            </div>
          </div>

          {/* Recursos */}
          <div className="rounded-lg border border-border p-4">
            <h3 className="mb-3 font-semibold text-sm">Recursos</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {RECURSOS_DISPONIVEIS.map((r) => (
                <label
                  key={r.key}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2"
                >
                  <div>
                    <div className="text-sm font-medium">{r.label}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{r.key}</div>
                  </div>
                  <Switch
                    checked={Boolean(form.recursos[r.key])}
                    onCheckedChange={(v) => toggleRecurso(r.key, v)}
                  />
                </label>
              ))}
            </div>
            {recursosExtras.length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <p className="mb-2 text-xs text-muted-foreground">
                  Recursos extras já existentes neste plano:
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {recursosExtras.map((k) => (
                    <label
                      key={k}
                      className="flex items-center justify-between gap-3 rounded-md border border-dashed border-border px-3 py-2"
                    >
                      <span className="font-mono text-xs">{k}</span>
                      <Switch
                        checked={Boolean(form.recursos[k])}
                        onCheckedChange={(v) => toggleRecurso(k, v)}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Flags */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div>
                <Label className="text-sm">Ativo</Label>
                <p className="text-[11px] text-muted-foreground">Aparece em /precos</p>
              </div>
              <Switch checked={form.ativo} onCheckedChange={(v) => setField("ativo", v)} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div>
                <Label className="text-sm">Destaque</Label>
                <p className="text-[11px] text-muted-foreground">“Mais popular”</p>
              </div>
              <Switch checked={form.destaque} onCheckedChange={(v) => setField("destaque", v)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ordem">Ordem</Label>
              <Input
                id="ordem"
                value={form.ordem}
                onChange={(e) => setField("ordem", e.target.value)}
                inputMode="numeric"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            <X className="h-4 w-4" />
            Cancelar
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LimiteField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="ilimitado"
        inputMode="numeric"
      />
    </div>
  );
}
