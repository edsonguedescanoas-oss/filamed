import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Activity, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — FilaMed" },
      { name: "description", content: "Acesse o painel administrativo do FilaMed." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { isAuthenticated, isLoading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  // Redireciona já autenticado
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      void navigate({ to: "/app" });
    }
  }, [isLoading, isAuthenticated, navigate]);

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

          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")} className="mt-8">
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(email, password);
      toast.success("Bem-vindo de volta!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao entrar";
      toast.error(msg.includes("Invalid login credentials") ? "Email ou senha incorretos" : msg);
    } finally {
      setLoading(false);
    }
  };

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
        <Label htmlFor="signin-password">Senha</Label>
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
