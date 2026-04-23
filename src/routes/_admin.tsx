import { createFileRoute, Outlet, redirect, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, LogOut, Building2, Home, Package, ShieldCheck, BarChart3, Siren } from "lucide-react";
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
  { to: "/admin/alertas", label: "Alertas", icon: Siren, exact: false, alertBadge: true },
  { to: "/admin/planos", label: "Planos", icon: Package, exact: false },
  { to: "/admin/auditoria", label: "Auditoria", icon: ShieldCheck, exact: false },
  { to: "/admin/logs", label: "Logs de Notificações", icon: Activity, exact: false },
];

function AdminLayout() {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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

          <nav className="hidden md:flex items-center gap-1 ml-6">
            {NAV.map((item) => {
              const active = item.exact
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-foreground/10 text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
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
