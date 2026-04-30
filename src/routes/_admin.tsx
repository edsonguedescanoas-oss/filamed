import { createFileRoute, Outlet, redirect, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, LogOut, Building2, Home, Package, ShieldCheck, BarChart3, Siren, ListChecks, Zap, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
  const [mobileOpen, setMobileOpen] = useState(false);
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

  // Fecha o menu mobile ao trocar de rota
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await signOut();
    void navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/40">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link to="/admin" className="group flex items-center gap-2.5 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg transition-all active:scale-95">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground shadow-lg transition-transform group-hover:rotate-3">
              <Activity className="h-5 w-5 text-background" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display text-lg font-bold tracking-tight">FilaMed</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Administration
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 ml-6 h-10 px-1 rounded-xl bg-muted/30 border border-border/50 overflow-x-auto no-scrollbar">
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
                    "relative flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    active
                      ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5",
                      showBadge && alertasCount.criticos > 0 && "text-destructive animate-pulse",
                    )}
                  />
                  {item.label}
                  {showBadge && (
                    <Badge
                      className={cn(
                        "h-4 min-w-[16px] justify-center px-1 text-[9px] font-black border-none shadow-sm",
                        alertasCount.criticos > 0
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-amber-500 text-white",
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

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end leading-tight mr-2">
              <span className="text-xs font-bold text-foreground truncate max-w-[120px]">
                {profile?.nome_completo}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">Super Admin</span>
            </div>
            
            <Button asChild variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-muted" title="Ver Site">
              <Link to="/">
                <Home className="h-4 w-4" />
              </Link>
            </Button>
            
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-destructive/10 hover:text-destructive" onClick={() => void handleLogout()} title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
