import { createFileRoute, Outlet, Link, useLocation, redirect } from "@tanstack/react-router";
import { LayoutDashboard, ListOrdered, Users, Ticket, Stethoscope, Volume2, BarChart3, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { allowedRoutesFor, canAccessRoute } from "@/lib/permissions";

export const Route = createFileRoute("/_app/app")({
  // Bloqueia URL direta para rotas sem permissão (ex: médico digitando /app/recepcao).
  // Admin sempre passa. Dashboard /app é liberado por allowedRoutesFor.
  beforeLoad: ({ context, location }) => {
    const { auth } = context;
    const isAdmin = auth.roles.includes("admin");
    if (isAdmin) return;
    if (!canAccessRoute(auth.roles, location.pathname)) {
      throw redirect({
        to: "/app",
        search: { denied: location.pathname } as never,
      });
    }
  },
  component: AppShell,
});

const NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/recepcao", label: "Recepção", icon: Ticket, exact: false },
  { to: "/app/atendimento", label: "Atendimento", icon: Stethoscope, exact: false },
  { to: "/app/filas", label: "Filas", icon: ListOrdered, exact: false },
  { to: "/app/pacientes", label: "Pacientes", icon: Users, exact: false },
  { to: "/app/voz", label: "Voz", icon: Volume2, exact: false },
  { to: "/app/notificacoes", label: "Notificações", icon: Ticket, exact: false }, // Use a proper icon later
  { to: "/app/relatorios", label: "Relatórios", icon: BarChart3, exact: false },
  { to: "/app/auditoria", label: "Auditoria", icon: ShieldCheck, exact: false },
] as const;

function AppShell() {
  const location = useLocation();
  const { roles } = useAuth();
  const allowed = allowedRoutesFor(roles);
  const visibleNav = NAV.filter((item) => allowed.has(item.to));

  return (
    <div>
      <nav className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex gap-1 overflow-x-auto">
            {visibleNav.map((item) => {
              const active = item.exact
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-gradient-primary" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <Outlet />
    </div>
  );
}
