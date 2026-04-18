import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Activity, Loader2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [{ title: "Configurar unidade — FilaMed" }],
  }),
  component: SetupPage,
});

function SetupPage() {
  const { isAuthenticated, isLoading, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    cnpj: "",
    endereco: "",
    telefone: "",
  });

  // Quem não está logado, vai pro login
  useEffect(() => {
    if (!isLoading && !isAuthenticated) void navigate({ to: "/login" });
  }, [isLoading, isAuthenticated, navigate]);

  // Quem já tem unidade, vai pro app
  useEffect(() => {
    if (profile?.unidade_id) void navigate({ to: "/app" });
  }, [profile, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("setup_initial_unidade", {
        _nome: form.nome,
        _cnpj: form.cnpj || undefined,
        _endereco: form.endereco || undefined,
        _telefone: form.telefone || undefined,
      });
      if (error) throw error;
      toast.success("Unidade criada com sucesso!");
      await refreshProfile();
      void navigate({ to: "/app" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao criar unidade";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary">
              <Activity className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-display text-lg font-semibold">FilaMed</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => void signOut().then(() => navigate({ to: "/login" }))}>
            Sair
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Configure sua unidade</h1>
            <p className="text-sm text-muted-foreground">
              Cadastre sua clínica ou hospital. Você será o administrador.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da unidade *</Label>
            <Input
              id="nome"
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Clínica Santa Maria"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                placeholder="(00) 0000-0000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Textarea
              id="endereco"
              rows={2}
              value={form.endereco}
              onChange={(e) => setForm({ ...form, endereco: e.target.value })}
              placeholder="Rua, número, bairro, cidade — UF"
            />
          </div>

          <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary shadow-soft">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar unidade e continuar"}
          </Button>
        </form>
      </main>
    </div>
  );
}
