import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Loader2, Search, RotateCcw, Copy, ExternalLink, Filter } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const Route = createFileRoute("/_admin/admin/convites")({
  head: () => ({
    meta: [{ title: "Admin · Convites — FilaMed" }],
  }),
  component: AdminConvitesPage,
});

interface InvitationRow {
  id: string;
  email: string;
  role: string;
  token: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  unidade: {
    nome: string;
  } | null;
}

function AdminConvitesPage() {
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [resendingId, setResendingId] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("invitations")
      .select(`
        id, email, role, token, created_at, expires_at, accepted_at,
        unidade:unidades(nome)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      toast.error("Erro ao carregar convites");
    } else {
      setInvitations((data ?? []) as any);
    }
    setLoading(false);
  };

  useEffect(() => {
    void carregar();
  }, []);

  const getStatus = (inv: InvitationRow) => {
    if (inv.accepted_at) return { label: "Aceito", variant: "default" as const, color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" };
    const expired = new Date(inv.expires_at) < new Date();
    if (expired) return { label: "Expirado", variant: "destructive" as const, color: "bg-destructive/10 text-destructive border-destructive/20" };
    return { label: "Pendente", variant: "outline" as const, color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" };
  };

  const filtered = invitations.filter((inv) => {
    const status = getStatus(inv);
    const matchesQuery =
      inv.email.toLowerCase().includes(q.toLowerCase()) ||
      inv.unidade?.nome.toLowerCase().includes(q.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "accepted" && inv.accepted_at) ||
      (statusFilter === "pending" && !inv.accepted_at && new Date(inv.expires_at) >= new Date()) ||
      (statusFilter === "expired" && !inv.accepted_at && new Date(inv.expires_at) < new Date());

    return matchesQuery && matchesStatus;
  });

  const handleResend = async (inv: InvitationRow) => {
    setResendingId(inv.id);
    try {
      const { data, error } = await supabase.functions.invoke("manage-clinic-users", {
        body: {
          action: "resend-invitation",
          invitationId: inv.id,
        },
      });

      if (error || data?.error) throw new Error(error?.message || data?.error || "Erro ao reenviar convite");

      toast.success("Link de convite renovado!");
      
      // Copy to clipboard automatically or show dialog
      if (data.invitationUrl) {
        await navigator.clipboard.writeText(data.invitationUrl);
        toast.info("Novo link copiado para a área de transferência");
      }
      
      void carregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao renovar convite");
    } finally {
      setResendingId(null);
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/aceitar-convite/${token}`;
    void navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Convites</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie os convites enviados para usuários de todas as unidades.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Lista de convites
            </CardTitle>
            <CardDescription>{filtered.length} convites encontrados</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por e-mail ou unidade…"
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
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="accepted">Aceitos</SelectItem>
                <SelectItem value="expired">Expirados</SelectItem>
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
              Nenhum convite encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>E-mail / Unidade</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expira em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((inv) => {
                    const status = getStatus(inv);
                    const isAccepted = !!inv.accepted_at;
                    const isResending = resendingId === inv.id;

                    return (
                      <TableRow key={inv.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{inv.email}</span>
                            <span className="text-xs text-muted-foreground">
                              {inv.unidade?.nome ?? "Unidade desconhecida"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {inv.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={status.color}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {isAccepted ? (
                            <span>Aceito em {new Date(inv.accepted_at!).toLocaleDateString()}</span>
                          ) : (
                            new Date(inv.expires_at).toLocaleDateString()
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {!isAccepted && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => void handleResend(inv)}
                                      disabled={isResending}
                                    >
                                      {isResending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <RotateCcw className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Renovar link e token</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            
                            {!isAccepted && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => copyLink(inv.token)}
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Copiar link atual</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    asChild
                                  >
                                    <a 
                                      href={`/aceitar-convite/${inv.token}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </a>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Abrir página do convite</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
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
    </div>
  );
}
