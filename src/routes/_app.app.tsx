import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, ListOrdered, Users, Ticket, Stethoscope, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { allowedRoutesFor } from "@/lib/permissions";

export const Route = createFileRoute("/_app/app")({
  component: AppShell,
});

const NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/recepcao", label: "Recepção", icon: Ticket, exact: false },
  { to: "/app/atendimento", label: "Atendimento", icon: Stethoscope, exact: false },
  { to: "/app/filas", label: "Filas", icon: ListOrdered, exact: false },
  { to: "/app/pacientes", label: "Pacientes", icon: Users, exact: false },
  { to: "/app/voz", label: "Voz", icon: Volume2, exact: false },
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
