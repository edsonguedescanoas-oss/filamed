import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Activity, Loader2, Shield, Ticket, Stethoscope, HeartPulse, BarChart3, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Contas de teste compartilhando a unidade Canoas
const TEST_ACCOUNTS: Array<{
  role: AppRole;
  label: string;
  email: string;
  icon: typeof Shield;
  color: string;
}> = [
  { role: "admin",      label: "Admin",      email: "admin.teste@filamed.dev",      icon: Shield,      color: "text-violet-600" },
  { role: "recepcao",   label: "Recepção",   email: "recepcao.teste@filamed.dev",   icon: Ticket,      color: "text-blue-600" },
  { role: "medico",     label: "Médico",     email: "medico.teste@filamed.dev",     icon: Stethoscope, color: "text-emerald-600" },
  { role: "enfermeiro", label: "Enfermeiro", email: "enfermeiro.teste@filamed.dev", icon: HeartPulse,  color: "text-rose-600" },
  { role: "gestor",     label: "Gestor",     email: "gestor.teste@filamed.dev",     icon: BarChart3,   color: "text-amber-600" },
];
const TEST_PASSWORD = "Teste1234!";

interface LoginSearch {
  redirect?: string;
}

export const Route = createFileRoute("/login")({
  // `redirect` opcional permite navegar para /login sem search params.
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  // Já logado vai direto pra /app (ou para o redirect pretendido)
  beforeLoad: ({ context, search }) => {
    if (context.auth.isAuthenticated) {
      if (context.auth.roles.includes("super_admin")) {
        throw redirect({ to: search.redirect ?? "/admin" });
      }
      if (context.auth.profile?.unidade_id) {
        throw redirect({ to: search.redirect ?? "/app" });
      }
      throw redirect({ to: "/setup" });
    }
  },
  head: () => ({
    meta: [
      { title: "Entrar — FilaMed" },
      { name: "description", content: "Acesse o painel administrativo do FilaMed." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { isAuthenticated, isLoading, roles, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  // Redireciona já autenticado
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (roles.includes("super_admin")) {
        void navigate({ to: "/admin" });
      } else {
        void navigate({ to: "/app" });
      }
    }
  }, [isLoading, isAuthenticated, roles, navigate]);

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Coluna visual */}
      <div className="hidden lg:flex relative overflow-hidden bg-gradient-primary p-12 flex-col justify-between text-primary-foreground">
        <div className="absolute inset-0 opacity-30" aria-hidden style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.25) 0%, transparent 45%)",
        }} />
        <Link to="/" className="relative flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-foreground/20 backdrop-blur">
            <Activity className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">FilaMed</span>
        </Link>
        <div className="relative max-w-md">
          <h1 className="font-display text-4xl font-bold leading-tight">
            Gestão inteligente de filas para sua unidade de saúde.
          </h1>
          <p className="mt-4 text-primary-foreground/85">
            Acompanhe filas em tempo real, reduza o tempo de espera e ofereça uma experiência moderna aos seus pacientes.
          </p>
        </div>
        <div className="relative text-sm text-primary-foreground/70">
          © {new Date().getFullYear()} FilaMed
        </div>
      </div>

      {/* Coluna formulário */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary">
              <Activity className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-display text-lg font-semibold">FilaMed</span>
          </div>

          <h2 className="font-display text-2xl font-bold">Acesse sua conta</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Entre com seu email ou crie uma conta para começar.
          </p>

          {import.meta.env.DEV && <QuickLoginPanel />}

          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")} className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6">
              <SignInForm onSubmit={signIn} />
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <SignUpForm onSubmit={signUp} onSuccess={() => setTab("signin")} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function SignInForm({ onSubmit }: { onSubmit: (email: string, password: string) => Promise<void> }) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "forgot">("signin");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        await onSubmit(email, password);
        toast.success("Bem-vindo de volta!");
      } else {
        await resetPassword(email);
        toast.success("Link de redefinição enviado para seu email!");
        setMode("signin");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha na operação";
      toast.error(msg.includes("Invalid login credentials") ? "Email ou senha incorretos" : msg);
    } finally {
      setLoading(false);
    }
  };

  if (mode === "forgot") {
    return (
      <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="space-y-2">
          <Label htmlFor="forgot-email">Email da sua conta</Label>
          <Input
            id="forgot-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@clinica.com"
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full bg-gradient-primary shadow-soft">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar link de redefinição"}
        </Button>
        <button
          type="button"
          onClick={() => setMode("signin")}
          className="w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          Voltar para o login
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signin-email">Email</Label>
        <Input
          id="signin-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@clinica.com"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="signin-password">Senha</Label>
          <button
            type="button"
            onClick={() => setMode("forgot")}
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Esqueceu a senha?
          </button>
        </div>
        <Input
          id="signin-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-gradient-primary shadow-soft">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
      </Button>
    </form>
  );
}

function SignUpForm({
  onSubmit,
  onSuccess,
}: {
  onSubmit: (email: string, password: string, nome: string) => Promise<void>;
  onSuccess: () => void;
}) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    setLoading(true);
    try {
      await onSubmit(email, password, nome);
      toast.success("Conta criada! Você já pode entrar.");
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao criar conta";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signup-nome">Nome completo</Label>
        <Input
          id="signup-nome"
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Maria Silva"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@clinica.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">Senha</Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-gradient-primary shadow-soft">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta"}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        Após criar a conta, você configurará sua unidade de saúde no próximo passo.
      </p>
    </form>
  );
}

function QuickLoginPanel() {
  const { signIn } = useAuth();
  const [loadingRole, setLoadingRole] = useState<AppRole | null>(null);

  const quickLogin = async (account: typeof TEST_ACCOUNTS[number]) => {
    setLoadingRole(account.role);
    try {
      await signIn(account.email, TEST_PASSWORD);
      toast.success(`Entrando como ${account.label}…`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao entrar";
      toast.error(msg);
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <div className="mt-8 rounded-2xl border border-border/60 bg-muted/40 p-5 shadow-inner">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Zap className="h-3.5 w-3.5" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
          Modo Desenvolvedor — Login Rápido
        </span>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {TEST_ACCOUNTS.map((acc) => {
          const Icon = acc.icon;
          const isLoading = loadingRole === acc.role;
          return (
            <button
              key={acc.role}
              type="button"
              disabled={loadingRole !== null}
              onClick={() => quickLogin(acc)}
              className={cn(
                "group flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-border/60 bg-background transition-all hover:border-primary/50 hover:shadow-soft hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none",
                isLoading && "ring-2 ring-primary ring-offset-2"
              )}
            >
              <div className={cn("p-2 rounded-lg bg-muted/50 group-hover:bg-primary/5 transition-colors", acc.color.replace('text-', 'bg-').replace('-600', '-500/10'))}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <Icon className={cn("h-4 w-4", acc.color)} />
                )}
              </div>
              <span className="text-[11px] font-bold text-foreground tracking-tight">{acc.label}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-[10px] text-muted-foreground/70 text-center">
        Senha: <code className="font-mono">Teste1234!</code>
      </p>
    </div>
  );
}
