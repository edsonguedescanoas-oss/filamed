import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ListOrdered,
  Plus,
  Pencil,
  Loader2,
  Power,
  PowerOff,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type FilaTipo = Database["public"]["Enums"]["fila_tipo"];
type Fila = Database["public"]["Tables"]["filas"]["Row"];

import { RoleGuard } from "@/components/role-guard";

export const Route = createFileRoute("/_app/app/filas")({
  head: () => ({ meta: [{ title: "Filas — FilaMed" }] }),
  component: () => (
    <RoleGuard allow={["recepcao", "gestor"]} path="/app/filas">
      <FilasPage />
    </RoleGuard>
  ),
});

const TIPOS: { value: FilaTipo; label: string }[] = [
  { value: "consulta", label: "Consulta" },
  { value: "exame", label: "Exame" },
  { value: "enfermagem", label: "Enfermagem" },
  { value: "urgencia", label: "Urgência" },
  { value: "farmacia", label: "Farmácia" },
  { value: "laboratorio", label: "Laboratório" },
  { value: "outro", label: "Outro" },
];

const PALETA = [
  "#0EA5E9", // sky
  "#14B8A6", // teal
  "#22C55E", // green
  "#EAB308", // yellow
  "#F97316", // orange
  "#EF4444", // red
  "#A855F7", // purple
  "#EC4899", // pink
];

const filaSchema = z.object({
  nome: z.string().trim().min(2, "Mínimo 2 caracteres").max(80, "Máximo 80 caracteres"),
  tipo: z.enum([
    "consulta",
    "exame",
    "enfermagem",
    "urgencia",
    "farmacia",
    "laboratorio",
    "outro",
  ]),
  prefixo_senha: z
    .string()
    .trim()
    .min(1, "Informe um prefixo")
    .max(4, "Máximo 4 caracteres")
    .regex(/^[A-Z0-9]+$/, "Apenas letras maiúsculas e números"),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor inválida"),
});

type FilaForm = z.infer<typeof filaSchema>;

function FilasPage() {
  const { profile, hasAnyRole } = useAuth();
  const unidadeId = profile?.unidade_id;
  const canManage = hasAnyRole(["admin", "recepcao"]);

  const [filas, setFilas] = useState<Fila[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Fila | null>(null);

  const fetchFilas = async () => {
    if (!unidadeId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("filas")
      .select("*")
      .eq("unidade_id", unidadeId)
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      toast.error("Erro ao carregar filas: " + error.message);
    } else {
      setFilas(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchFilas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidadeId]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (fila: Fila) => {
    setEditing(fila);
    setDialogOpen(true);
  };

  const toggleAtiva = async (fila: Fila) => {
    const { error } = await supabase
      .from("filas")
      .update({ ativa: !fila.ativa })
      .eq("id", fila.id);
    if (error) {
      toast.error("Falha: " + error.message);
      return;
    }
    toast.success(fila.ativa ? "Fila desativada" : "Fila ativada");
    void fetchFilas();
  };

  const moveOrder = async (fila: Fila, dir: -1 | 1) => {
    const idx = filas.findIndex((f) => f.id === fila.id);
    const swap = filas[idx + dir];
    if (!swap) return;
    // troca ordens
    const { error } = await supabase.from("filas").upsert([
      { ...fila, ordem: swap.ordem },
      { ...swap, ordem: fila.ordem },
    ]);
    if (error) {
      toast.error("Falha ao reordenar: " + error.message);
      return;
    }
    void fetchFilas();
  };

  const ativasCount = useMemo(() => filas.filter((f) => f.ativa).length, [filas]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Configuração
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold">Filas da unidade</h1>
          <p className="mt-1 text-muted-foreground">
            {filas.length} {filas.length === 1 ? "fila cadastrada" : "filas cadastradas"} ·{" "}
            {ativasCount} {ativasCount === 1 ? "ativa" : "ativas"}
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate} className="bg-gradient-primary shadow-soft">
            <Plus className="h-4 w-4" />
            Nova fila
          </Button>
        )}
      </header>

      {!canManage && (
        <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          Você pode visualizar as filas, mas apenas administradores e recepção podem editá-las.
        </div>
      )}

      <div className="mt-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filas.length === 0 ? (
          <EmptyState canManage={canManage} onCreate={openCreate} />
        ) : (
          <div className="grid gap-4">
            {filas.map((fila, idx) => (
              <FilaRow
                key={fila.id}
                fila={fila}
                canManage={canManage}
                isFirst={idx === 0}
                isLast={idx === filas.length - 1}
                onEdit={() => openEdit(fila)}
                onToggle={() => void toggleAtiva(fila)}
                onMoveUp={() => void moveOrder(fila, -1)}
                onMoveDown={() => void moveOrder(fila, 1)}
              />
            ))}
          </div>
        )}
      </div>

      <FilaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        unidadeId={unidadeId ?? null}
        nextOrdem={filas.length}
        onSaved={() => {
          setDialogOpen(false);
          void fetchFilas();
        }}
      />
    </div>
  );
}

function EmptyState({ canManage, onCreate }: { canManage: boolean; onCreate: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
        <ListOrdered className="h-6 w-6 text-primary-foreground" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">Nenhuma fila configurada</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
        Crie sua primeira fila para começar a gerar senhas. Você pode separar por consulta,
        exame, urgência e outros tipos.
      </p>
      {canManage && (
        <Button onClick={onCreate} className="mt-5 bg-gradient-primary shadow-soft">
          <Plus className="h-4 w-4" />
          Criar primeira fila
        </Button>
      )}
    </div>
  );
}

function FilaRow({
  fila,
  canManage,
  isFirst,
  isLast,
  onEdit,
  onToggle,
  onMoveUp,
  onMoveDown,
}: {
  fila: Fila;
  canManage: boolean;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const tipoLabel = TIPOS.find((t) => t.value === fila.tipo)?.label ?? fila.tipo;
  return (
    <div
      className={cn(
        "group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-soft transition-all",
        !fila.ativa && "opacity-60",
      )}
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white font-bold text-sm shadow-soft"
        style={{ backgroundColor: fila.cor ?? "#3B82F6" }}
      >
        {fila.prefixo_senha}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-display font-semibold truncate">{fila.nome}</h3>
          <Badge variant="outline" className="capitalize">
            {tipoLabel}
          </Badge>
          {!fila.ativa && (
            <Badge variant="secondary" className="text-muted-foreground">
              Inativa
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Próxima senha: <span className="font-mono">{fila.prefixo_senha}{String(fila.contador_senha + 1).padStart(3, "0")}</span> · Ordem {fila.ordem + 1}
        </p>
      </div>

      {canManage && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMoveUp}
            disabled={isFirst}
            aria-label="Mover para cima"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onMoveDown}
            disabled={isLast}
            aria-label="Mover para baixo"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Editar">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            aria-label={fila.ativa ? "Desativar" : "Ativar"}
          >
            {fila.ativa ? (
              <PowerOff className="h-4 w-4 text-destructive" />
            ) : (
              <Power className="h-4 w-4 text-primary" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function FilaDialog({
  open,
  onOpenChange,
  editing,
  unidadeId,
  nextOrdem,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Fila | null;
  unidadeId: string | null;
  nextOrdem: number;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FilaForm>({
    nome: "",
    tipo: "consulta",
    prefixo_senha: "",
    cor: PALETA[0],
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FilaForm, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setErrors({});
      if (editing) {
        setForm({
          nome: editing.nome,
          tipo: editing.tipo,
          prefixo_senha: editing.prefixo_senha,
          cor: editing.cor ?? PALETA[0],
        });
      } else {
        setForm({ nome: "", tipo: "consulta", prefixo_senha: "", cor: PALETA[0] });
      }
    }
  }, [open, editing]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!unidadeId) return;

    const parsed = filaSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Partial<Record<keyof FilaForm, string>> = {};
      parsed.error.issues.forEach((iss) => {
        const key = iss.path[0] as keyof FilaForm;
        if (!errs[key]) errs[key] = iss.message;
      });
      setErrors(errs);
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from("filas")
          .update({
            nome: parsed.data.nome,
            tipo: parsed.data.tipo,
            prefixo_senha: parsed.data.prefixo_senha,
            cor: parsed.data.cor,
          })
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Fila atualizada");
      } else {
        const { error } = await supabase.from("filas").insert({
          unidade_id: unidadeId,
          nome: parsed.data.nome,
          tipo: parsed.data.tipo,
          prefixo_senha: parsed.data.prefixo_senha,
          cor: parsed.data.cor,
          ordem: nextOrdem,
        });
        if (error) throw error;
        toast.success("Fila criada");
      }
      onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao salvar";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar fila" : "Nova fila"}</DialogTitle>
          <DialogDescription>
            Configure como as senhas serão geradas e exibidas no painel.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fila-nome">Nome da fila *</Label>
            <Input
              id="fila-nome"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Consulta clínica geral"
              maxLength={80}
            />
            {errors.nome && <p className="text-xs text-destructive">{errors.nome}</p>}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fila-tipo">Tipo *</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) => setForm({ ...form, tipo: v as FilaTipo })}
              >
                <SelectTrigger id="fila-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fila-prefixo">Prefixo da senha *</Label>
              <Input
                id="fila-prefixo"
                value={form.prefixo_senha}
                onChange={(e) =>
                  setForm({ ...form, prefixo_senha: e.target.value.toUpperCase() })
                }
                placeholder="C"
                maxLength={4}
                className="font-mono"
              />
              {errors.prefixo_senha && (
                <p className="text-xs text-destructive">{errors.prefixo_senha}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cor de identificação *</Label>
            <div className="flex flex-wrap gap-2">
              {PALETA.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, cor: c })}
                  className={cn(
                    "h-9 w-9 rounded-lg border-2 transition-all",
                    form.cor === c
                      ? "border-foreground scale-110 shadow-soft"
                      : "border-transparent hover:scale-105",
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-muted/50 p-4 flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl text-white font-bold text-sm shadow-soft"
              style={{ backgroundColor: form.cor }}
            >
              {form.prefixo_senha || "?"}
            </div>
            <div className="text-sm">
              <p className="font-medium">{form.nome || "Pré-visualização"}</p>
              <p className="text-xs text-muted-foreground font-mono">
                Próxima senha: {form.prefixo_senha || "?"}001
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-gradient-primary shadow-soft">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editing ? (
                "Salvar alterações"
              ) : (
                "Criar fila"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
