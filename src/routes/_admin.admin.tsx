import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Loader2, Search, Plus, Settings2, Power, PowerOff, Pencil, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { AssinaturaStatus } from "@/hooks/use-auth";

export const Route = createFileRoute("/_admin/admin")({
  head: () => ({
    meta: [{ title: "Admin · Unidades — FilaMed" }],
  }),
  component: AdminUnidadesPage,
});

interface UnidadeRow {
  id: string;
  nome: string;
  slug: string;
  ativo: boolean;
  status_assinatura: AssinaturaStatus;
  trial_ends_at: string;
  created_at: string;
  cnpj: string | null;
  telefone: string | null;
  endereco: string | null;
  revenda_id: string | null;
  revenda?: { nome: string } | null;
}

const STATUS_VARIANT: Record<AssinaturaStatus, { label: string; className: string }> = {
  trial: { label: "Trial", className: "bg-primary/10 text-primary border-primary/20" },
  ativo: { label: "Ativo", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  suspenso: { label: "Suspenso", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  cancelado: { label: "Cancelado", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

function diasRestantes(trialEndsAt: string): number {
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function AdminUnidadesPage() {
  const [unidades, setUnidades] = useState<UnidadeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<UnidadeRow | null>(null);
  const [statusChange, setStatusChange] = useState<{ unidade: UnidadeRow; novoStatus: AssinaturaStatus } | null>(null);

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("unidades")
      .select("id, nome, slug, ativo, status_assinatura, trial_ends_at, created_at, cnpj, telefone, endereco, revenda_id, revenda:revendas(nome)")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      toast.error("Erro ao carregar unidades");
    } else {
      setUnidades((data ?? []) as unknown as UnidadeRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void carregar();
  }, []);

  const filtered = unidades.filter((u) => {
    const matchesQuery =
      u.nome.toLowerCase().includes(q.toLowerCase()) ||
      u.slug.toLowerCase().includes(q.toLowerCase()) ||
      (u.cnpj?.includes(q) ?? false);
    const matchesStatus = statusFilter === "all" || u.status_assinatura === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const stats = {
    total: unidades.length,
    trial: unidades.filter((u) => u.status_assinatura === "trial").length,
    ativo: unidades.filter((u) => u.status_assinatura === "ativo").length,
    bloqueadas: unidades.filter(
      (u) =>
        u.status_assinatura === "suspenso" ||
        u.status_assinatura === "cancelado" ||
        (u.status_assinatura === "trial" && diasRestantes(u.trial_ends_at) === 0),
    ).length,
  };

  const handleStatusChange = async () => {
    if (!statusChange) return;
    const { error } = await supabase.rpc("admin_atualizar_status_unidade" as never, {
      _unidade_id: statusChange.unidade.id,
      _novo_status: statusChange.novoStatus,
      _ativo: statusChange.novoStatus === "cancelado" ? false : true,
    } as never);
    if (error) {
      toast.error("Erro ao alterar status: " + error.message);
    } else {
      toast.success(`Unidade ${statusChange.novoStatus === "ativo" ? "ativada" : statusChange.novoStatus}`);
      setStatusChange(null);
      void carregar();
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Unidades</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie clínicas cadastradas: criar, editar, suspender e ver integrações.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Nova unidade
        </Button>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total de unidades" value={stats.total} />
        <StatCard label="Em trial" value={stats.trial} />
        <StatCard label="Assinantes ativos" value={stats.ativo} />
        <StatCard label="Bloqueadas" value={stats.bloqueadas} variant="danger" />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Lista de unidades
            </CardTitle>
            <CardDescription>{filtered.length} de {unidades.length}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, slug ou CNPJ…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="suspenso">Suspensos</SelectItem>
                <SelectItem value="cancelado">Cancelados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhuma unidade encontrada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Trial</TableHead>
                    <TableHead>Revenda</TableHead>
                    <TableHead>Criada em</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => {
                    const dias = diasRestantes(u.trial_ends_at);
                    const variant = STATUS_VARIANT[u.status_assinatura];
                    const podeAtivar = u.status_assinatura === "suspenso" || u.status_assinatura === "cancelado";
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          {u.nome}
                          {!u.ativo && (
                            <span className="ml-2 text-xs text-muted-foreground">(inativa)</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={variant.className}>
                            {variant.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {u.status_assinatura === "trial" ? (
                            dias === 0 ? (
                              <span className="text-destructive">Expirado</span>
                            ) : (
                              <span>
                                {dias} {dias === 1 ? "dia" : "dias"}
                              </span>
                            )
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {u.revenda?.nome ? (
                            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              {u.revenda.nome}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {fmtDate(u.created_at)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {u.slug}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              asChild
                              title="Ver integração"
                            >
                              <Link to="/admin/unidades/$unidadeId" params={{ unidadeId: u.id }}>
                                <Settings2 className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditing(u)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {podeAtivar ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setStatusChange({ unidade: u, novoStatus: "ativo" })}
                                title="Reativar"
                                className="text-emerald-600 hover:text-emerald-700"
                              >
                                <Power className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setStatusChange({ unidade: u, novoStatus: "suspenso" })}
                                title="Suspender"
                                className="text-amber-600 hover:text-amber-700"
                              >
                                <PowerOff className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateUnidadeDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          void carregar();
        }}
      />

      <EditUnidadeDialog
        unidade={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          void carregar();
        }}
      />

      <AlertDialog open={!!statusChange} onOpenChange={(o) => !o && setStatusChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusChange?.novoStatus === "ativo" ? "Reativar unidade?" : "Suspender unidade?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusChange?.novoStatus === "ativo"
                ? `A unidade "${statusChange.unidade.nome}" voltará a ter acesso completo ao sistema.`
                : `A unidade "${statusChange?.unidade.nome}" perderá acesso até ser reativada. Os dados não serão excluídos.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleStatusChange()}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CreateUnidadeDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    nome: "",
    slug: "",
    cnpj: "",
    telefone: "",
    endereco: "",
    trial_dias: 14,
  });
  const [saving, setSaving] = useState(false);

  const reset = () => setForm({ nome: "", slug: "", cnpj: "", telefone: "", endereco: "", trial_dias: 14 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc("admin_criar_unidade" as never, {
      _nome: form.nome,
      _slug: form.slug || null,
      _cnpj: form.cnpj || null,
      _telefone: form.telefone || null,
      _endereco: form.endereco || null,
      _trial_dias: form.trial_dias,
    } as never);
    setSaving(false);
    if (error) {
      toast.error("Erro ao criar unidade: " + error.message);
    } else {
      toast.success("Unidade criada com sucesso");
      reset();
      onCreated();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova unidade</DialogTitle>
          <DialogDescription>Cadastre uma nova clínica na plataforma.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Clínica Exemplo"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="slug">Slug (opcional)</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="auto-gerado se vazio"
              />
            </div>
            <div>
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                placeholder="00.000.000/0000-00"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              placeholder="(11) 99999-9999"
            />
          </div>
          <div>
            <Label htmlFor="endereco">Endereço</Label>
            <Input
              id="endereco"
              value={form.endereco}
              onChange={(e) => setForm({ ...form, endereco: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="trial_dias">Dias de trial</Label>
            <Input
              id="trial_dias"
              type="number"
              min={0}
              max={90}
              value={form.trial_dias}
              onChange={(e) => setForm({ ...form, trial_dias: Number(e.target.value) })}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar unidade
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditUnidadeDialog({
  unidade,
  onClose,
  onSaved,
}: {
  unidade: UnidadeRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ nome: "", cnpj: "", telefone: "", endereco: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (unidade) {
      setForm({
        nome: unidade.nome,
        cnpj: unidade.cnpj ?? "",
        telefone: unidade.telefone ?? "",
        endereco: unidade.endereco ?? "",
      });
    }
  }, [unidade]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unidade) return;
    setSaving(true);
    const { error } = await supabase
      .from("unidades")
      .update({
        nome: form.nome,
        cnpj: form.cnpj || null,
        telefone: form.telefone || null,
        endereco: form.endereco || null,
      })
      .eq("id", unidade.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Unidade atualizada");
      onSaved();
    }
  };

  return (
    <Dialog open={!!unidade} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar unidade</DialogTitle>
          <DialogDescription>Atualize os dados cadastrais.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-nome">Nome</Label>
            <Input
              id="edit-nome"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="edit-cnpj">CNPJ</Label>
            <Input
              id="edit-cnpj"
              value={form.cnpj}
              onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="edit-telefone">Telefone</Label>
            <Input
              id="edit-telefone"
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="edit-endereco">Endereço</Label>
            <Input
              id="edit-endereco"
              value={form.endereco}
              onChange={(e) => setForm({ ...form, endereco: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant?: "danger";
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p
          className={
            variant === "danger" && value > 0
              ? "mt-2 text-3xl font-bold text-destructive"
              : "mt-2 text-3xl font-bold"
          }
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
