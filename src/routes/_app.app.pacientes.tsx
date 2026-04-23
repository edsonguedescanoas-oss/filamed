import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Users,
  Plus,
  Pencil,
  Loader2,
  Search,
  Phone,
  Mail,
  IdCard,
  CalendarDays,
  FileText,
} from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Database } from "@/integrations/supabase/types";

type Paciente = Database["public"]["Tables"]["pacientes"]["Row"];

import { RoleGuard } from "@/components/role-guard";

export const Route = createFileRoute("/_app/app/pacientes")({
  head: () => ({ meta: [{ title: "Pacientes — FilaMed" }] }),
  component: () => (
    <RoleGuard allow={["recepcao", "medico", "enfermeiro", "gestor"]} path="/app/pacientes">
      <PacientesPage />
    </RoleGuard>
  ),
});

// ───────── helpers de máscara ─────────
const onlyDigits = (v: string) => v.replace(/\D/g, "");

function maskCPF(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function maskTelefone(v: string): string {
  const digits = onlyDigits(v);
  // Garante que comece com 55 se não tiver nada
  let d = digits;
  if (d.length > 0 && !d.startsWith("55") && d.length <= 11) {
    d = "55" + d;
  }
  
  d = d.slice(0, 13); // 55 + 2 + 9 = 13 digits
  
  if (d.length <= 4) return d;
  if (d.length <= 6) return d.replace(/(\d{2})(\d{2})/, "$1 $2");
  if (d.length <= 11) {
    return d.replace(/(\d{2})(\d{2})(\d{1,})/, "$1 $2 $3");
  }
  return d.replace(/(\d{2})(\d{2})(\d{5})(\d{1,})/, "$1 $2 $3-$4");
}

function isValidCPF(cpf: string): boolean {
  const d = onlyDigits(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(d[i], 10) * (10 - i);
  let r = (s * 10) % 11;
  if (r === 10) r = 0;
  if (r !== parseInt(d[9], 10)) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(d[i], 10) * (11 - i);
  r = (s * 10) % 11;
  if (r === 10) r = 0;
  return r === parseInt(d[10], 10);
}

// ───────── schema ─────────
const pacienteSchema = z.object({
  nome_completo: z
    .string()
    .trim()
    .min(2, "Mínimo 2 caracteres")
    .max(120, "Máximo 120 caracteres"),
  cpf: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || isValidCPF(v), "CPF inválido"),
  data_nascimento: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Data inválida"),
  telefone: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || onlyDigits(v).length >= 10, "Telefone inválido"),
  email: z
    .string()
    .trim()
    .email("E-mail inválido")
    .max(255, "Máximo 255 caracteres")
    .optional()
    .or(z.literal("")),
  prontuario: z.string().trim().max(40, "Máximo 40 caracteres").optional(),
  observacoes: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
});

type PacienteForm = z.infer<typeof pacienteSchema>;

const EMPTY_FORM: PacienteForm = {
  nome_completo: "",
  cpf: "",
  data_nascimento: "",
  telefone: "",
  email: "",
  prontuario: "",
  observacoes: "",
};

function PacientesPage() {
  const { profile, hasAnyRole } = useAuth();
  const unidadeId = profile?.unidade_id;
  const canManage = hasAnyRole(["admin", "recepcao"]);

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Paciente | null>(null);

  const fetchPacientes = async () => {
    if (!unidadeId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("pacientes")
      .select("*")
      .eq("unidade_id", unidadeId)
      .order("nome_completo", { ascending: true });
    if (error) {
      toast.error("Erro ao carregar pacientes: " + error.message);
    } else {
      setPacientes(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchPacientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidadeId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pacientes;
    const qDigits = onlyDigits(q);
    return pacientes.filter((p) => {
      const nameMatch = p.nome_completo.toLowerCase().includes(q);
      const cpfMatch = qDigits.length > 0 && p.cpf && onlyDigits(p.cpf).includes(qDigits);
      const prontMatch = p.prontuario?.toLowerCase().includes(q);
      return nameMatch || cpfMatch || prontMatch;
    });
  }, [pacientes, search]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (paciente: Paciente) => {
    setEditing(paciente);
    setDialogOpen(true);
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Cadastro
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold">Pacientes</h1>
          <p className="mt-1 text-muted-foreground">
            {pacientes.length} {pacientes.length === 1 ? "paciente cadastrado" : "pacientes cadastrados"}
            {search && ` · ${filtered.length} ${filtered.length === 1 ? "encontrado" : "encontrados"}`}
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate} className="bg-gradient-primary shadow-soft">
            <Plus className="h-4 w-4" />
            Novo paciente
          </Button>
        )}
      </header>

      <div className="mt-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, CPF ou prontuário…"
          className="pl-9"
        />
      </div>

      {!canManage && (
        <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          Você pode visualizar pacientes, mas apenas administradores e recepção podem cadastrá-los ou editá-los.
        </div>
      )}

      <div className="mt-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            canManage={canManage}
            onCreate={openCreate}
            isFiltered={pacientes.length > 0}
          />
        ) : (
          <div className="grid gap-3">
            {filtered.map((paciente) => (
              <PacienteRow
                key={paciente.id}
                paciente={paciente}
                canManage={canManage}
                onEdit={() => openEdit(paciente)}
              />
            ))}
          </div>
        )}
      </div>

      <PacienteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        unidadeId={unidadeId ?? null}
        onSaved={() => {
          setDialogOpen(false);
          void fetchPacientes();
        }}
      />
    </div>
  );
}

function EmptyState({
  canManage,
  onCreate,
  isFiltered,
}: {
  canManage: boolean;
  onCreate: () => void;
  isFiltered: boolean;
}) {
  if (isFiltered) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
        <Search className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          Nenhum paciente encontrado com esse filtro.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
        <Users className="h-6 w-6 text-primary-foreground" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">
        Nenhum paciente cadastrado
      </h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
        Cadastre seus pacientes para vinculá-los às senhas e atendimentos.
      </p>
      {canManage && (
        <Button onClick={onCreate} className="mt-5 bg-gradient-primary shadow-soft">
          <Plus className="h-4 w-4" />
          Cadastrar primeiro paciente
        </Button>
      )}
    </div>
  );
}

function PacienteRow({
  paciente,
  canManage,
  onEdit,
}: {
  paciente: Paciente;
  canManage: boolean;
  onEdit: () => void;
}) {
  const initials = paciente.nome_completo
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");

  const idade = paciente.data_nascimento
    ? Math.floor(
        (Date.now() - parseISO(paciente.data_nascimento).getTime()) /
          (1000 * 60 * 60 * 24 * 365.25),
      )
    : null;

  return (
    <div className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-soft transition-all hover:border-primary/40">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground font-bold text-sm shadow-soft">
        {initials || "?"}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="font-display font-semibold truncate">{paciente.nome_completo}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {paciente.cpf && (
            <span className="inline-flex items-center gap-1 font-mono">
              <IdCard className="h-3 w-3" />
              {maskCPF(paciente.cpf)}
            </span>
          )}
          {paciente.data_nascimento && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {format(parseISO(paciente.data_nascimento), "dd/MM/yyyy", { locale: ptBR })}
              {idade !== null && ` · ${idade} anos`}
            </span>
          )}
          {paciente.telefone && (
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {maskTelefone(paciente.telefone)}
            </span>
          )}
          {paciente.email && (
            <span className="inline-flex items-center gap-1 truncate">
              <Mail className="h-3 w-3" />
              {paciente.email}
            </span>
          )}
          {paciente.prontuario && (
            <span className="inline-flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Prontuário {paciente.prontuario}
            </span>
          )}
        </div>
      </div>

      {canManage && (
        <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Editar paciente">
          <Pencil className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function PacienteDialog({
  open,
  onOpenChange,
  editing,
  unidadeId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Paciente | null;
  unidadeId: string | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<PacienteForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof PacienteForm, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setErrors({});
      if (editing) {
        setForm({
          nome_completo: editing.nome_completo,
          cpf: editing.cpf ? maskCPF(editing.cpf) : "",
          data_nascimento: editing.data_nascimento ?? "",
          telefone: editing.telefone ? maskTelefone(editing.telefone) : "",
          email: editing.email ?? "",
          prontuario: editing.prontuario ?? "",
          observacoes: editing.observacoes ?? "",
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }, [open, editing]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!unidadeId) return;

    const parsed = pacienteSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Partial<Record<keyof PacienteForm, string>> = {};
      parsed.error.issues.forEach((iss) => {
        const key = iss.path[0] as keyof PacienteForm;
        if (!errs[key]) errs[key] = iss.message;
      });
      setErrors(errs);
      return;
    }

    // normaliza para o banco: dígitos puros e null em vazios
    const payload = {
      nome_completo: parsed.data.nome_completo,
      cpf: parsed.data.cpf ? onlyDigits(parsed.data.cpf) : null,
      data_nascimento: parsed.data.data_nascimento || null,
      telefone: parsed.data.telefone ? onlyDigits(parsed.data.telefone) : null,
      email: parsed.data.email ? parsed.data.email : null,
      prontuario: parsed.data.prontuario || null,
      observacoes: parsed.data.observacoes || null,
    };

    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from("pacientes")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Paciente atualizado");
      } else {
        const { error } = await supabase
          .from("pacientes")
          .insert({ unidade_id: unidadeId, ...payload });
        if (error) throw error;
        toast.success("Paciente cadastrado");
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar paciente" : "Novo paciente"}
          </DialogTitle>
          <DialogDescription>
            Apenas o nome é obrigatório. Os demais campos ajudam a identificar e contatar o paciente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pac-nome">Nome completo *</Label>
            <Input
              id="pac-nome"
              value={form.nome_completo}
              onChange={(e) => setForm({ ...form, nome_completo: e.target.value })}
              placeholder="Maria Silva Santos"
              maxLength={120}
              autoFocus
            />
            {errors.nome_completo && (
              <p className="text-xs text-destructive">{errors.nome_completo}</p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pac-cpf">CPF</Label>
              <Input
                id="pac-cpf"
                value={form.cpf ?? ""}
                onChange={(e) => setForm({ ...form, cpf: maskCPF(e.target.value) })}
                placeholder="000.000.000-00"
                inputMode="numeric"
                className="font-mono"
              />
              {errors.cpf && <p className="text-xs text-destructive">{errors.cpf}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pac-nasc">Data de nascimento</Label>
              <Input
                id="pac-nasc"
                type="date"
                value={form.data_nascimento ?? ""}
                onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })}
                max={new Date().toISOString().slice(0, 10)}
              />
              {errors.data_nascimento && (
                <p className="text-xs text-destructive">{errors.data_nascimento}</p>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pac-tel">Telefone</Label>
              <Input
                id="pac-tel"
                value={form.telefone ?? ""}
                onChange={(e) => setForm({ ...form, telefone: maskTelefone(e.target.value) })}
                placeholder="(11) 99999-9999"
                inputMode="tel"
              />
              {errors.telefone && (
                <p className="text-xs text-destructive">{errors.telefone}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pac-email">E-mail</Label>
              <Input
                id="pac-email"
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="paciente@email.com"
                maxLength={255}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pac-pront">Número do prontuário</Label>
            <Input
              id="pac-pront"
              value={form.prontuario ?? ""}
              onChange={(e) => setForm({ ...form, prontuario: e.target.value })}
              placeholder="Ex: 2025-0042"
              maxLength={40}
            />
            {errors.prontuario && (
              <p className="text-xs text-destructive">{errors.prontuario}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pac-obs">Observações</Label>
            <Textarea
              id="pac-obs"
              value={form.observacoes ?? ""}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              placeholder="Alergias, condições, preferências…"
              maxLength={500}
              rows={3}
            />
            {errors.observacoes && (
              <p className="text-xs text-destructive">{errors.observacoes}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-gradient-primary shadow-soft"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editing ? (
                "Salvar alterações"
              ) : (
                "Cadastrar paciente"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
