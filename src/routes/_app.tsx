import { createFileRoute, Outlet, useNavigate, Link, useLocation, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Loader2,
  LogOut,
  Menu,
  LayoutDashboard,
  ClipboardList,
  Users,
  Stethoscope,
  Headphones,
  Volume2,
  MessageCircle,
  UserCircle,
  ChevronDown,
  CreditCard,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { canAccessRoute } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { TrialBanner } from "@/components/trial-banner";
import { TrialBlocked } from "@/components/trial-blocked";
import { usePlanoAtual } from "@/hooks/use-plano-atual";

export const Route = createFileRoute("/_app")({
  // Preconnect Supabase só nas rotas /app, onde realmente é usado.
  // Mantê-lo no root marcava como "unused preconnect" na home.
  head: () => ({
    links: [
      { rel: "preconnect", href: "https://bccvpirrqwhqsinlmpth.supabase.co", crossOrigin: "anonymous" },
      { rel: "dns-prefetch", href: "https://bccvpirrqwhqsinlmpth.supabase.co" },
    ],
  }),
  // Guard idiomático: roda antes de renderizar qualquer rota /app/*.
  // Sem flash de conteúdo — o redirect acontece antes do React montar.
  beforeLoad: ({ context, location }) => {
    const { auth } = context;
    if (!auth.isAuthenticated) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
    if (!auth.profile?.unidade_id) {
      throw redirect({ to: "/setup" });
    }
  },
  component: AppLayout,
});

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Se true, só ativa em match exato (caso do dashboard "/app"). */
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/recepcao", label: "Recepção", icon: ClipboardList },
  { to: "/app/atendimento", label: "Atendimento", icon: Stethoscope },
  { to: "/app/filas", label: "Filas", icon: Headphones },
  { to: "/app/pacientes", label: "Pacientes", icon: Users },
  { to: "/app/voz", label: "Voz", icon: Volume2 },
  { to: "/app/notificacoes", label: "Notificações", icon: MessageCircle },
];

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  recepcao: "Recepção",
  medico: "Médico(a)",
  enfermeiro: "Enfermeiro(a)",
  gestor: "Gestor(a)",
  super_admin: "Super Admin",
};

function getInitials(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

function AppLayout() {
  const { profile, roles, trial, signOut } = useAuth();
  const { plano } = usePlanoAtual(profile?.unidade_id);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Redirects de auth/unidade agora ficam no beforeLoad — sem flash de conteúdo.

  // Fecha o menu mobile ao trocar de rota
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Filtra os itens de navegação pelas permissões do usuário
  const visibleItems = useMemo(() => {
    const isAdmin = roles.includes("admin");
    return NAV_ITEMS.filter((item) => isAdmin || canAccessRoute(roles, item.to));
  }, [roles]);

  const primaryRole: AppRole | undefined = roles[0];

  // Fallback raro: snapshot do auth-store ainda não populou o profile no React
  // (o beforeLoad já garantiu sessão + unidade, então é flicker mínimo).
  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Bloqueio: trial expirado, suspenso ou cancelado
  if (trial?.expirado) {
    return <TrialBlocked trial={trial} />;
  }

  const handleLogout = async () => {
    await signOut();
    // O subscribeAuth do router invalida e o beforeLoad de /_app redireciona.
    void navigate({ to: "/login" });
  };

  const isItemActive = (item: NavItem) =>
    item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          {/* Logo */}
          <Link to="/app" className="flex items-center gap-2 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary">
              <Activity className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-display text-lg font-semibold">
              Fila<span className="text-gradient">Med</span>
            </span>
          </Link>

          {/* Nav desktop */}
          <nav className="hidden lg:flex items-center gap-1 ml-4">
            {visibleItems.map((item) => {
              const active = isItemActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Badge do plano atual (desktop) */}
          <Link
            to="/app/conta"
            className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors"
            title="Ver detalhes da assinatura"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {plano ? plano.plano_nome : trial?.status_assinatura === "trial" ? "Trial" : "Sem plano"}
            {plano && (
              <span className="text-[10px] text-muted-foreground">
                · {plano.ciclo === "anual" ? "anual" : "mensal"}
              </span>
            )}
          </Link>

          {/* Dropdown usuário (desktop + mobile) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 h-10 px-2 sm:px-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.nome_completo} />
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs font-semibold">
                    {getInitials(profile.nome_completo)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex flex-col items-start leading-tight">
                  <span className="text-sm font-medium max-w-[140px] truncate">
                    {profile.nome_completo}
                  </span>
                  {primaryRole && (
                    <span className="text-xs text-muted-foreground">
                      {ROLE_LABELS[primaryRole]}
                    </span>
                  )}
                </div>
                <ChevronDown className="hidden sm:block h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col gap-1">
                <span className="font-medium">{profile.nome_completo}</span>
                <div className="flex flex-wrap gap-1">
                  {roles.map((r) => (
                    <Badge key={r} variant="secondary" className="text-[10px] font-normal">
                      {ROLE_LABELS[r]}
                    </Badge>
                  ))}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void navigate({ to: "/app/conta" })}>
                <CreditCard className="h-4 w-4" />
                <span>Minha conta</span>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <UserCircle className="h-4 w-4" />
                <span>Meu perfil</span>
                <span className="ml-auto text-[10px] text-muted-foreground">em breve</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void handleLogout()} className="text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Hamburger mobile */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <SheetHeader className="border-b border-border px-6 py-4">
                <SheetTitle className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
                    <Activity className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
                  </div>
                  <span className="font-display">Navegação</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 p-4">
                {visibleItems.map((item) => {
                  const active = isItemActive(item);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-muted",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {trial && <TrialBanner trial={trial} />}

      <main>
        <Outlet />
      </main>
    </div>
  );
}
