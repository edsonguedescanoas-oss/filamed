import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/app")({
  component: AppShell,
});

const NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/filas", label: "Filas", icon: ListOrdered, exact: false },
] as const;

function AppShell() {
  const location = useLocation();

  return (
    <div>
      <nav className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex gap-1 overflow-x-auto">
            {NAV.map((item) => {
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
