import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

  useEffect(() => {
    let cancel = false;
    void (async () => {
      const { data, error } = await supabase
        .from("unidades")
        .select("id, nome, slug, ativo, status_assinatura, trial_ends_at, created_at")
        .order("created_at", { ascending: false });
      if (cancel) return;
      if (error) {
        console.error(error);
      } else {
        setUnidades((data ?? []) as UnidadeRow[]);
      }
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const filtered = unidades.filter(
    (u) =>
      u.nome.toLowerCase().includes(q.toLowerCase()) ||
      u.slug.toLowerCase().includes(q.toLowerCase()),
  );

  const stats = {
    total: unidades.length,
    trial: unidades.filter((u) => u.status_assinatura === "trial").length,
    ativo: unidades.filter((u) => u.status_assinatura === "ativo").length,
    bloqueadas: unidades.filter((u) =>
      u.status_assinatura === "suspenso" ||
      u.status_assinatura === "cancelado" ||
      (u.status_assinatura === "trial" && diasRestantes(u.trial_ends_at) === 0),
    ).length,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Unidades</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão geral das clínicas cadastradas na plataforma.
          </p>
        </div>
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
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou slug…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
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
                    <TableHead>Criada em</TableHead>
                    <TableHead className="text-right">Slug</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => {
                    const dias = diasRestantes(u.trial_ends_at);
                    const variant = STATUS_VARIANT[u.status_assinatura];
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
                                {dias} {dias === 1 ? "dia" : "dias"} · até {fmtDate(u.trial_ends_at)}
                              </span>
                            )
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {fmtDate(u.created_at)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                          {u.slug}
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
