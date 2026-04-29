import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { canAccessRoute } from "@/lib/permissions";

interface RoleGuardProps {
  /** Roles que podem acessar. Admin sempre passa. */
  allow?: AppRole[];
  /** Permissão específica necessária. */
  permission?: string;
  /** Path canônico (ex: "/app/atendimento") usado para o redirect contextual. */
  path: string;
  children: ReactNode;
}

/**
 * Bloqueia o conteúdo se o usuário não tiver nenhuma das roles permitidas.
 * Admin tem acesso irrestrito.
 */
export function RoleGuard({ allow, permission, path, children }: RoleGuardProps) {
  const { roles, hasPermission, isLoading } = useAuth();
  const navigate = useNavigate();

  const isAdmin = roles.includes("admin") || roles.includes("super_admin");
  const allowed = 
    isAdmin || 
    (allow && allow.some((r) => roles.includes(r))) || 
    (permission && hasPermission(permission)) || 
    canAccessRoute(roles, path);

  useEffect(() => {
    if (isLoading) return;
    if (!allowed) {
      toast.error("Acesso restrito", {
        description: "Você não tem permissão para acessar esta tela.",
      });
      void navigate({ to: "/app" });
    }
  }, [allowed, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert className="h-7 w-7 text-destructive" />
        </div>
        <h2 className="mt-4 font-display text-xl font-semibold">Acesso restrito</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta tela não faz parte das suas funções. Redirecionando…
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
