import { createFileRoute, Outlet, redirect, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, LogOut, Building2, Home, Package, ShieldCheck, BarChart3, Siren, ListChecks, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_admin")({
  beforeLoad: ({ context, location }) => {
    const { auth } = context;
    if (!auth.isAuthenticated) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    if (!auth.roles.includes("super_admin")) {
      // Sem permissão: manda pro app deles ou login
      throw redirect({ to: auth.profile?.unidade_id ? "/app" : "/login" });
    }
  },
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Unidades", icon: Building2, exact: true },
  { to: "/admin/metricas", label: "Métricas", icon: BarChart3, exact: false },
  { to: "/admin/classificacao", label: "Classificação", icon: ListChecks, exact: false },
  { to: "/admin/alertas", label: "Alertas", icon: Siren, exact: false, alertBadge: true },
  { to: "/admin/planos", label: "Planos", icon: Package, exact: false },
  { to: "/admin/auditoria", label: "Auditoria", icon: ShieldCheck, exact: false },
  { to: "/admin/logs", label: "Logs de Notificações", icon: Activity, exact: false },
  { to: "/admin/crm", label: "CRM Chat", icon: Package, exact: false },
  { to: "/admin/automacoes", label: "Automações", icon: Zap, exact: false },
];

function AdminLayout() {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [alertasCount, setAlertasCount] = useState<{ total: number; criticos: number }>({
    total: 0,
    criticos: 0,
  });

  // Resumo de alertas para badge no menu (atualiza a cada 60s)
  useEffect(() => {
    let cancel = false;
    const carregar = async () => {
      const { data } = await (
        supabase.rpc as unknown as (
          fn: string,
          a: Record<string, unknown>,
        ) => Promise<{
          data: { total_alertas: number; criticos: number } | null;
          error: unknown;
        }>
      )("admin_alertas_resumo", { _janela_horas: 24, _min_falhas: 2 });
      if (cancel || !data) return;
      setAlertasCount({ total: data.total_alertas ?? 0, criticos: data.criticos ?? 0 });
    };
    void carregar();
    const t = setInterval(() => void carregar(), 60_000);
    return () => {
      cancel = true;
      clearInterval(t);
    };
  }, []);

  const handleLogout = async () => {
    await signOut();
    void navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link to="/admin" className="flex items-center gap-2 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground">
              <Activity className="h-5 w-5 text-background" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-display text-base font-semibold">FilaMed</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Admin
              </span>
            </div>
          </Link>

          <nav className="order-last flex w-full items-center gap-1 overflow-x-auto pb-1 md:order-none md:ml-6 md:w-auto md:overflow-visible md:pb-0">
            {NAV.map((item) => {
              const active = item.exact
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to);
              const Icon = item.icon;
              const showBadge = item.alertBadge && alertasCount.total > 0;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-foreground/10 text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      showBadge && alertasCount.criticos > 0 && "text-destructive",
                    )}
                  />
                  {item.label}
                  {showBadge && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-5 min-w-[20px] justify-center px-1.5 text-[10px] font-bold",
                        alertasCount.criticos > 0
                          ? "border-destructive/40 bg-destructive/10 text-destructive"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
                      )}
                    >
                      {alertasCount.total}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex-1" />

          <span className="hidden sm:inline text-sm text-muted-foreground">
            {profile?.nome_completo}
          </span>
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Site</span>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void handleLogout()}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
