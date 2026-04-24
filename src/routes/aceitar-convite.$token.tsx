import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/aceitar-convite/$token")({
  head: () => ({
    meta: [
      { title: "Aceitar Convite — FilaMed" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AcceptInvitationPage,
});

function AcceptInvitationPage() {
  const { token } = useParams({ from: "/aceitar-convite/$token" });
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<{
    id: string;
    email: string;
    unidade_nome: string;
    role: string;
    is_valid: boolean;
  } | null>(null);

  const [formData, setFormData] = useState({
    nome_completo: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc("check_invitation_token", { _token: token });
        
        if (rpcError) throw rpcError;
        
        const invite = (data as any)?.[0];
        
        if (!invite || !invite.is_valid) {
          setError("Este convite é inválido ou já expirou.");
        } else {
          setInvitation(invite);
          setFormData(prev => ({ ...prev, nome_completo: invite.nome_completo || "" }));
        }
      } catch (err) {
        console.error("Erro ao verificar convite:", err);
        setError("Ocorreu um erro ao verificar seu convite.");
      } finally {
        setLoading(false);
      }
    };

    void verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (formData.password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: functionError } = await supabase.functions.invoke("manage-clinic-users", {
        body: {
          action: "accept-invitation",
          token,
          password: formData.password,
          nome_completo: formData.nome_completo,
        }
      });

      if (functionError || data?.error) {
        throw new Error(functionError?.message || data?.error || "Erro ao aceitar convite");
      }

      toast.success("Conta criada com sucesso! Redirecionando...");
      
      // Auto login
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: invitation!.email,
        password: formData.password,
      });

      if (loginError) {
        navigate({ to: "/login" });
      } else {
        navigate({ to: "/app" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar conta");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Convite inválido</h1>
        <p className="text-slate-400 max-w-md">{error || "Não foi possível encontrar este convite."}</p>
        <Button variant="link" className="mt-4 text-primary" onClick={() => navigate({ to: "/login" })}>
          Ir para o login
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <Card className="w-full max-w-md border-white/10 bg-slate-900 text-white">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Você foi convidado!</CardTitle>
          <CardDescription className="text-slate-400">
            Crie sua conta para acessar a unidade <strong>{invitation.unidade_nome}</strong>.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={invitation.email} disabled className="bg-slate-800 border-white/10" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nome_completo">Seu nome completo</Label>
              <Input 
                id="nome_completo" 
                required 
                value={formData.nome_completo}
                onChange={e => setFormData(prev => ({ ...prev, nome_completo: e.target.value }))}
                placeholder="Ex: João Silva" 
                className="bg-slate-800 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                value={formData.password}
                onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="bg-slate-800 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirmar senha</Label>
              <Input 
                id="confirm_password" 
                type="password" 
                required 
                value={formData.confirmPassword}
                onChange={e => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="bg-slate-800 border-white/10"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Ativar meu acesso"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
