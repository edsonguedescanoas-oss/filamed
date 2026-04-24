import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, Eye, Loader2, Plus, Save, ShieldCheck, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoleGuard } from "@/components/role-guard";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_ROUTES } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";

type UnidadeRole = Exclude<AppRole, "super_admin">;

type UsuarioRow = {
  id: string;
  nome_completo: string;
  telefone: string | null;
  ativo: boolean;
  role: UnidadeRole | null;
};

const ROLE_LABELS: Record<UnidadeRole, string> = {
  admin: "Admin",
  gestor: "Gestor",
  recepcao: "Recepção",
  medico: "Médico",
  enfermeiro: "Enfermeiro",
};

const ROLE_HELP: Record<UnidadeRole, string> = {
  admin: "Configura unidade, usuários, filas, canais e opera todo o fluxo.",
  gestor: "Acompanha gestão, relatórios, auditoria, filas, pontos e notificações.",
  recepcao: "Gera senhas, faz pré-atendimento, guichê, pacientes e notificações.",
  medico: "Atende pacientes e consulta histórico clínico liberado.",
  enfermeiro: "Atende pacientes e consulta histórico clínico liberado.",
};

const ASSIGNABLE_ROLES: UnidadeRole[] = ["admin", "gestor", "recepcao", "medico", "enfermeiro"];

const MODULES = [
  { label: "Dashboard", path: "/app" },
  { label: "Recepção", path: "/app/recepcao" },
  { label: "Guichê", path: "/app/guiche" },
  { label: "Atendimento", path: "/app/atendimento" },
  { label: "Filas", path: "/app/filas" },
  { label: "Pontos", path: "/app/pontos" },
  { label: "Pacientes", path: "/app/pacientes" },
  { label: "Voz", path: "/app/voz" },
  { label: "TV / Painel", path: "/app/tv" },
  { label: "Notificações", path: "/app/notificacoes" },
  { label: "Relatórios", path: "/app/relatorios" },
  { label: "Auditoria", path: "/app/auditoria" },
  { label: "Usuários", path: "/app/usuarios" },
];

export const Route = createFileRoute("/_app/app/usuarios")({
  head: () => ({ meta: [{ title: "Usuários e permissões — FilaMed" }] }),
  component: () => (
    <RoleGuard allow={["admin", "gestor"]} path="/app/usuarios">
      <UsuariosPage />
    </RoleGuard>
  ),
});

function UsuariosPage() {
  const { profile, roles } = useAuth();
  const unidadeId = profile?.unidade_id ?? null;
  const canManage = roles.includes("admin");
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState<UsuarioRow | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const carregarUsuarios = async () => {
    if (!unidadeId) return;
    setLoading(true);
    const [profilesRes, rolesRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, nome_completo, telefone, ativo")
        .eq("unidade_id", unidadeId)
        .order("nome_completo"),
      supabase.from("user_roles").select("user_id, role").eq("unidade_id", unidadeId),
    ]);

    if (profilesRes.error || rolesRes.error) {
      toast.error(profilesRes.error?.message || rolesRes.error?.message || "Erro ao carregar usuários");
      setLoading(false);
      return;
    }

    const roleByUser = new Map<string, UnidadeRole>();
    for (const item of rolesRes.data ?? []) {
      if (item.role !== "super_admin") roleByUser.set(item.user_id, item.role as UnidadeRole);
    }

    setUsuarios(
      (profilesRes.data ?? []).map((u) => ({
        ...u,
        role: roleByUser.get(u.id) ?? null,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    void carregarUsuarios();
  }, [unidadeId]);

  const totals = useMemo(() => {
    return ASSIGNABLE_ROLES.map((role) => ({
      role,
      total: usuarios.filter((u) => u.role === role).length,
    }));
  }, [usuarios]);

  const alterarRole = async (usuario: UsuarioRow, role: UnidadeRole) => {
    if (!unidadeId || !canManage || usuario.id === profile?.id) return;
    setSavingUserId(usuario.id);
    try {
      const { data, error } = await supabase.functions.invoke("manage-clinic-users", {
        body: {
          action: "update",
          unidadeId,
          userId: usuario.id,
          updates: { role }
        }
      });

      if (error || data?.error) throw new Error(error?.message || data?.error || "Erro ao atualizar permissão");

      setUsuarios((prev) => prev.map((u) => (u.id === usuario.id ? { ...u, role } : u)));
      toast.success("Permissão atualizada");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não foi possível atualizar a permissão";
      toast.error(msg);
    } finally {
      setSavingUserId(null);
    }
  };

  const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!unidadeId) return;
    setFormLoading(true);
    const formData = new FormData(e.currentTarget);
    const userData = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      nome_completo: formData.get("nome_completo") as string,
      telefone: formData.get("telefone") as string,
      role: formData.get("role") as UnidadeRole,
    };

    try {
      const { data, error } = await supabase.functions.invoke("manage-clinic-users", {
        body: {
          action: "create",
          unidadeId,
          userData
        }
      });

      if (error || data?.error) throw new Error(error?.message || data?.error || "Erro ao criar usuário");

      toast.success("Usuário criado com sucesso!");
      setIsAddingUser(false);
      void carregarUsuarios();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar usuário");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!unidadeId) return;
    setSavingUserId(userId);
    try {
      const { data, error } = await supabase.functions.invoke("manage-clinic-users", {
        body: {
          action: "delete",
          unidadeId,
          userId
        }
      });

      if (error || data?.error) throw new Error(error?.message || data?.error || "Erro ao excluir usuário");

      toast.success("Usuário excluído com sucesso");
      setUsuarios(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir usuário");
    } finally {
      setSavingUserId(null);
    }
  };

  const handleEditUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!unidadeId || !isEditingUser) return;
    setFormLoading(true);
    const formData = new FormData(e.currentTarget);
    const updates = {
      nome_completo: formData.get("nome_completo") as string,
      telefone: formData.get("telefone") as string,
      ativo: formData.get("ativo") === "on",
    };

    try {
      const { data, error } = await supabase.functions.invoke("manage-clinic-users", {
        body: {
          action: "update",
          unidadeId,
          userId: isEditingUser.id,
          updates
        }
      });

      if (error || data?.error) throw new Error(error?.message || data?.error || "Erro ao atualizar usuário");

      toast.success("Usuário atualizado com sucesso!");
      setIsEditingUser(null);
      void carregarUsuarios();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar usuário");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Controle de acesso</p>
          <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">Usuários e permissões</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Defina o perfil de cada pessoa e acompanhe quais módulos ficam liberados para admin, gestor e operadores.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <Dialog open={isAddingUser} onOpenChange={setIsAddingUser}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar usuário
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleAddUser}>
                  <DialogHeader>
                    <DialogTitle>Adicionar novo usuário</DialogTitle>
                    <DialogDescription>
                      O usuário será criado no sistema com acesso à sua unidade.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="nome_completo">Nome completo</Label>
                      <Input id="nome_completo" name="nome_completo" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" name="email" type="email" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password">Senha inicial</Label>
                      <Input id="password" name="password" type="password" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="telefone">Telefone (opcional)</Label>
                      <Input id="telefone" name="telefone" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="role">Perfil de acesso</Label>
                      <Select name="role" defaultValue="recepcao" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um perfil" />
                        </SelectTrigger>
                        <SelectContent>
                          {ASSIGNABLE_ROLES.map((role) => (
                            <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={formLoading}>
                      {formLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Criar usuário"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
          <Badge variant={canManage ? "default" : "outline"} className="gap-1.5 py-1.5">
            {canManage ? <ShieldCheck className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {canManage ? "Edição liberada" : "Somente leitura"}
          </Badge>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {totals.map(({ role, total }) => (
          <Card key={role}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{ROLE_LABELS[role]}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">{total}</p>
                </div>
                <Users className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Matriz de permissões</CardTitle>
          <CardDescription>Operadores incluem recepção, médico e enfermeiro, cada um com acesso ao seu fluxo.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-3 pr-4 font-semibold">Módulo</th>
                {ASSIGNABLE_ROLES.map((role) => (
                  <th key={role} className="px-3 py-3 text-center font-semibold">{ROLE_LABELS[role]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map((mod) => (
                <tr key={mod.path} className="border-b border-border/60 last:border-0">
                  <td className="py-3 pr-4 font-medium">{mod.label}</td>
                  {ASSIGNABLE_ROLES.map((role) => {
                    const allowed = ROLE_ROUTES[role].includes(mod.path);
                    return (
                      <td key={role} className="px-3 py-3 text-center">
                        {allowed ? (
                          <Check className="mx-auto h-4 w-4 text-primary" />
                        ) : (
                          <X className="mx-auto h-4 w-4 text-muted-foreground/50" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuários da unidade</CardTitle>
          <CardDescription>Admin pode alterar perfis. Gestor apenas visualiza a matriz e a distribuição.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : usuarios.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              Nenhum usuário encontrado nesta unidade.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {usuarios.map((usuario) => {
                const currentRole = usuario.role ?? "recepcao";
                const saving = savingUserId === usuario.id;
                const locked = !canManage || usuario.id === profile?.id;
                return (
                  <div key={usuario.id} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{usuario.nome_completo}</p>
                        <Badge variant="outline" className={cn("text-[10px]", usuario.ativo ? "" : "text-destructive")}>
                          {usuario.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                        {usuario.id === profile?.id && <Badge variant="secondary" className="text-[10px]">Você</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{ROLE_HELP[currentRole]}</p>
                      {usuario.telefone && <p className="mt-0.5 text-xs text-muted-foreground">{usuario.telefone}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:w-auto">
                      <div className="w-[180px]">
                        <Select
                          value={currentRole}
                          disabled={locked || saving}
                          onValueChange={(value) => void alterarRole(usuario, value as UnidadeRole)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ASSIGNABLE_ROLES.map((role) => (
                              <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {canManage && usuario.id !== profile?.id && (
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground"
                            onClick={() => setIsEditingUser(usuario)}
                          >
                            <Save className="h-4 w-4" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-destructive opacity-70 hover:opacity-100"
                                disabled={saving}
                              >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação excluirá permanentemente a conta de <strong>{usuario.nome_completo}</strong> e removerá seu acesso à unidade.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => void handleDeleteUser(usuario.id)}
                                >
                                  Excluir usuário
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                      
                      {saving && <Save className="h-4 w-4 animate-pulse text-primary" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!isEditingUser} onOpenChange={(open) => !open && setIsEditingUser(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleEditUser}>
            <DialogHeader>
              <DialogTitle>Editar usuário</DialogTitle>
              <DialogDescription>
                Atualize as informações de {isEditingUser?.nome_completo}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_nome">Nome completo</Label>
                <Input id="edit_nome" name="nome_completo" defaultValue={isEditingUser?.nome_completo} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_telefone">Telefone</Label>
                <Input id="edit_telefone" name="telefone" defaultValue={isEditingUser?.telefone || ""} />
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="edit_ativo" 
                  name="ativo" 
                  defaultChecked={isEditingUser?.ativo}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="edit_ativo">Usuário ativo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Salvar alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}