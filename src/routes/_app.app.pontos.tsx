import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  Search,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RoleGuard } from "@/components/role-guard";
import { HistoricoPonto } from "@/components/historico-ponto";
import type { Database } from "@/integrations/supabase/types";

type PontoTipo = Database["public"]["Enums"]["ponto_tipo"];
type Ponto = Database["public"]["Tables"]["pontos_atendimento"]["Row"];
type Fila = { id: string; nome: string; tipo: Database["public"]["Enums"]["fila_tipo"] };
type ProfileOption = { id: string; nome_completo: string };
type PontoPermissao = {
  id: string;
  ponto_atendimento_id: string;
  user_id: string;
};

const TIPOS: { value: PontoTipo; label: string; descricao: string }[] = [
  { value: "guiche", label: "Guichê", descricao: "Pré-atendimento e classificação" },
  { value: "consultorio", label: "Consultório", descricao: "Consultas clínicas" },
  { value: "exame", label: "Sala de Exame", descricao: "Ultrassom, raio-X, etc." },
  { value: "outro", label: "Outro", descricao: "Outro tipo de estação" },
];

export const Route = createFileRoute("/_app/app/pontos")({
  head: () => ({ meta: [{ title: "Pontos de Atendimento — FilaMed" }] }),
  component: () => (
    <RoleGuard allow={["admin", "gestor"]} path="/app/pontos">
      <PontosPage />
    </RoleGuard>
  ),
});

function PontosPage() {
  const { profile } = useAuth();
  const unidadeId = profile?.unidade_id;

  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [usuarios, setUsuarios] = useState<ProfileOption[]>([]);
  const [permissoes, setPermissoes] = useState<PontoPermissao[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<"todos" | "ativos" | "inativos">("todos");

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Ponto | null>(null);
  const [form, setForm] = useState<{
    nome: string;
    tipo: PontoTipo;
    fila_id: string | null;
    ativo: boolean;
  }>({ nome: "", tipo: "guiche", fila_id: null, ativo: true });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchAll = async () => {
    if (!unidadeId) return;
    setLoading(true);
    const [pRes, fRes, uRes, permRes] = await Promise.all([
      supabase
        .from("pontos_atendimento")
        .select("*")
        .eq("unidade_id", unidadeId)
        .order("tipo")
        .order("nome"),
      supabase
        .from("filas")
        .select("id,nome,tipo")
        .eq("unidade_id", unidadeId)
        .eq("ativa", true)
        .order("nome"),
      supabase
        .from("profiles")
        .select("id,nome_completo")
        .eq("unidade_id", unidadeId)
        .eq("ativo", true)
        .order("nome_completo"),
      supabase
        .from("ponto_atendimento_permissoes" as never)
        .select("id,ponto_atendimento_id,user_id")
        .eq("unidade_id", unidadeId),
    ]);
    if (pRes.error) toast.error("Erro ao carregar pontos: " + pRes.error.message);
    if (fRes.error) toast.error("Erro ao carregar filas: " + fRes.error.message);
    if (uRes.error) toast.error("Erro ao carregar usuários: " + uRes.error.message);
    if (permRes.error) toast.error("Erro ao carregar permissões: " + permRes.error.message);
    setPontos(pRes.data ?? []);
    setFilas((fRes.data ?? []) as Fila[]);
    setUsuarios((uRes.data ?? []) as ProfileOption[]);
    setPermissoes((permRes.data ?? []) as unknown as PontoPermissao[]);
    setLoading(false);
  };

  useEffect(() => {
    void fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidadeId]);

  const filaById = useMemo(() => new Map(filas.map((f) => [f.id, f])), [filas]);
  const usuarioById = useMemo(() => new Map(usuarios.map((u) => [u.id, u])), [usuarios]);

  const permissoesPorPonto = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const perm of permissoes) {
      const set = map.get(perm.ponto_atendimento_id) ?? new Set<string>();
      set.add(perm.user_id);
      map.set(perm.ponto_atendimento_id, set);
    }
    return map;
  }, [permissoes]);

  const usuariosFiltrados = useMemo(() => {
    const termo = normalizar(busca);
    if (!termo) return usuarios;
    return usuarios.filter((usuario) => normalizar(usuario.nome_completo).includes(termo));
  }, [busca, usuarios]);

  const pontosFiltrados = useMemo(() => {
    const termo = normalizar(busca);
    return pontos.filter((ponto) => {
      if (statusFiltro === "ativos" && !ponto.ativo) return false;
      if (statusFiltro === "inativos" && ponto.ativo) return false;
      if (!termo) return true;

      const fila = ponto.fila_id ? filaById.get(ponto.fila_id) : null;
      const tipo = TIPOS.find((t) => t.value === ponto.tipo)?.label ?? ponto.tipo;
      const usuariosDoPonto = Array.from(permissoesPorPonto.get(ponto.id) ?? [])
        .map((userId) => usuarioById.get(userId)?.nome_completo ?? "")
        .join(" ");
      return normalizar([ponto.nome, tipo, fila?.nome, usuariosDoPonto].filter(Boolean).join(" ")).includes(termo);
    });
  }, [busca, filaById, permissoesPorPonto, pontos, statusFiltro, usuarioById]);

  const grupos = useMemo(() => {
    const m = new Map<PontoTipo, Ponto[]>();
    for (const p of pontosFiltrados) {
      const arr = m.get(p.tipo) ?? [];
      arr.push(p);
      m.set(p.tipo, arr);
    }
    return m;
  }, [pontosFiltrados]);

  const openNew = () => {
    setEditing(null);
    setForm({ nome: "", tipo: "guiche", fila_id: null, ativo: true });
    setEditOpen(true);
  };

  const openEdit = (p: Ponto) => {
    setEditing(p);
    setForm({
      nome: p.nome,
      tipo: p.tipo,
      fila_id: p.fila_id,
      ativo: p.ativo,
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!unidadeId) return;
    if (form.nome.trim().length < 2) {
      toast.error("Informe o nome do ponto (ex: Guichê 02, Consultório 001).");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from("pontos_atendimento")
          .update({
            nome: form.nome.trim(),
            tipo: form.tipo,
            fila_id: form.fila_id,
            ativo: form.ativo,
          })
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Ponto atualizado");
      } else {
        const { error } = await supabase.from("pontos_atendimento").insert({
          unidade_id: unidadeId,
          nome: form.nome.trim(),
          tipo: form.tipo,
          fila_id: form.fila_id,
          ativo: form.ativo,
        });
        if (error) throw error;
        toast.success("Ponto criado");
      }
      setEditOpen(false);
      void fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAtivo = async (p: Ponto) => {
    const { error } = await supabase
      .from("pontos_atendimento")
      .update({ ativo: !p.ativo })
      .eq("id", p.id);
    if (error) {
      toast.error("Falha ao alternar status: " + error.message);
      return;
    }
    toast.success(p.ativo ? "Ponto desativado" : "Ponto ativado");
    void fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase
      .from("pontos_atendimento")
      .delete()
      .eq("id", deleteId);
    if (error) {
      toast.error("Falha ao excluir: " + error.message);
    } else {
      toast.success("Ponto excluído");
      void fetchAll();
    }
    setDeleteId(null);
  };

  const handleTogglePermissao = async (pontoId: string, userId: string, checked: boolean) => {
    if (!unidadeId) return;
    if (checked) {
      const { error } = await supabase.from("ponto_atendimento_permissoes" as never).insert({
        unidade_id: unidadeId,
        ponto_atendimento_id: pontoId,
        user_id: userId,
      } as never);
      if (error) {
        toast.error("Falha ao permitir usuário: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("ponto_atendimento_permissoes" as never)
        .delete()
        .eq("ponto_atendimento_id", pontoId)
        .eq("user_id", userId);
      if (error) {
        toast.error("Falha ao remover permissão: " + error.message);
        return;
      }
    }
    await fetchAll();
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Gestão operacional
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold">Configurar pontos e permissões</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Cadastre pontos, altere status e defina quais usuários podem operar cada guichê,
            consultório ou sala de exame.
          </p>
        </div>
        <Button onClick={openNew} className="bg-gradient-primary">
          <Plus className="h-4 w-4" /> Novo ponto
        </Button>
      </div>

      <div className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-[minmax(0,1fr)_12rem]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por usuário ou ponto"
            className="pl-9"
          />
        </div>
        <Select value={statusFiltro} onValueChange={(v) => setStatusFiltro(v as typeof statusFiltro)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="ativos">Ativos</SelectItem>
            <SelectItem value="inativos">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-8 space-y-6">
        {pontosFiltrados.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <MapPin className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
            {pontos.length === 0 ? "Nenhum ponto cadastrado. Comece criando o primeiro Guichê." : "Nenhum ponto encontrado para os filtros atuais."}
          </div>
        )}

        {TIPOS.map((t) => {
          const arr = grupos.get(t.value) ?? [];
          if (arr.length === 0) return null;
          return (
            <section key={t.value} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/20">
                <div className="flex items-center gap-2">
                  <span className="font-display font-semibold">{t.label}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {arr.length}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{t.descricao}</p>
              </div>
              <ul className="divide-y divide-border">
                {arr.map((p) => {
                  const fila = p.fila_id ? filaById.get(p.fila_id) : null;
                  const usuariosPermitidos = permissoesPorPonto.get(p.id) ?? new Set<string>();
                  return (
                    <li
                      key={p.id}
                      className="grid gap-4 px-5 py-4 hover:bg-muted/30 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,1.2fr)_auto] lg:items-start"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <MapPin
                          className={
                            "h-4 w-4 " + (p.ativo ? "text-primary" : "text-muted-foreground/50")
                          }
                        />
                        <div className="min-w-0">
                          <div className="font-medium">{p.nome}</div>
                          <div className="text-xs text-muted-foreground">
                            {fila ? `Atende: ${fila.nome}` : "Sem fila vinculada"}
                            {!p.ativo && " · Inativo"}
                          </div>
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-background/60 p-3">
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                          <Users className="h-3.5 w-3.5" /> Usuários permitidos
                          {usuariosPermitidos.size > 0 && (
                            <Badge variant="outline" className="ml-auto text-[10px]">
                              {usuariosPermitidos.size}
                            </Badge>
                          )}
                        </div>
                        {usuariosFiltrados.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Nenhum usuário ativo na unidade.</p>
                        ) : (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {usuariosFiltrados.map((usuario) => (
                              <label
                                key={usuario.id}
                                className="flex items-center gap-2 text-xs text-foreground"
                              >
                                <input
                                  type="checkbox"
                                  className="h-3.5 w-3.5 accent-primary"
                                  checked={usuariosPermitidos.has(usuario.id)}
                                  onChange={(e) =>
                                    void handleTogglePermissao(p.id, usuario.id, e.target.checked)
                                  }
                                />
                                <span className="truncate">{usuario.nome_completo}</span>
                              </label>
                            ))}
                          </div>
                        )}
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          Sem usuários marcados, qualquer usuário da equipe pode ocupar este ponto.
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleAtivo(p)}
                          title={p.ativo ? "Desativar" : "Ativar"}
                        >
                          {p.ativo ? (
                            <PowerOff className="h-3.5 w-3.5" />
                          ) : (
                            <Power className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteId(p.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {/* Histórico unificado de TODOS os pontos da unidade — admin pode filtrar
          por qualquer ponto/período/senha aqui (visão de auditoria operacional). */}
      {unidadeId && (
        <div className="mt-10">
          <HistoricoPonto
            unidadeId={unidadeId}
            titulo="Histórico de chamadas e finalizações"
          />
        </div>
      )}

      {/* Dialog edição */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar ponto" : "Novo ponto de atendimento"}</DialogTitle>
            <DialogDescription>
              O nome aparece na TV quando o atendente desta estação chama uma senha.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ponto-nome">Nome *</Label>
              <Input
                id="ponto-nome"
                placeholder="Ex: Guichê 02, Consultório 001, Ultrassom 001"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) => setForm((f) => ({ ...f, tipo: v as PontoTipo }))}
              >
                <SelectTrigger>
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
              <Label>Fila vinculada (opcional)</Label>
              <Select
                value={form.fila_id ?? "__none__"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, fila_id: v === "__none__" ? null : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Sem vínculo —</SelectItem>
                  {filas.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Se vinculado, este ponto atende preferencialmente esta fila.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <div className="text-sm font-medium">Ativo</div>
                <div className="text-xs text-muted-foreground">
                  Pontos inativos não aparecem no seletor dos atendentes.
                </div>
              </div>
              <Switch
                checked={form.ativo}
                onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ponto de atendimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. Atendentes que estavam vinculados a este
              ponto precisarão escolher outro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function normalizar(valor: string) {
  return valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
