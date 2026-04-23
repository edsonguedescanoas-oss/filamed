import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { canAccessRoute } from "@/lib/permissions";

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

function AppShell() {
  return <Outlet />;
}

