import { createFileRoute, useParams, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Loader2, CheckCircle2, Building2, Clock, AlertCircle, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type InvitationData = {
  id: string;
  email: string;
  unidade_nome: string;
  unidade_endereco: string | null;
  role: string;
  role_permissions: string;
  is_valid: boolean;
  expires_at: string;
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  recepcao: "Recepção",
  medico: "Médico",
  enfermeiro: "Enfermeiro",
};

export const Route = createFileRoute("/convite/$token")({
  head: () => ({
    meta: [
      { title: "Convite para Unidade — FilaMed" },
      { name: "description", content: "Você foi convidado para participar de uma unidade no FilaMed." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AcceptancePage,
});

function AcceptancePage() {
  const { token } = useParams({ from: "/convite/$token" });
  const { isAuthenticated, user, signIn, signUp, isLoading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [accepting, setAccepting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const fetchInvitation = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const { data, error: e } = await supabase.rpc("check_invitation_token", { _token: token });
      
      const details = (data as any)?.[0] as InvitationData;
      
      if (e || !details) {
        if (!isSilent) setError("Convite não encontrado ou inválido.");
        // Se já tínhamos o convite e agora deu erro (ou foi aceito), invalidamos localmente
        setInvitation(prev => {
          if (prev && isSilent) {
            return { ...prev, is_valid: false };
          }
          return prev;
        });
        return;
      }
      
      setInvitation(details);
    } catch (err) {
      if (!isSilent) setError("Erro ao carregar convite.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchInvitation();
  }, [fetchInvitation]);

  // Contador de expiração
  useEffect(() => {
    if (!invitation?.expires_at || !invitation.is_valid) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expires = new Date(invitation.expires_at).getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setTimeLeft("Expirado");
        setInvitation(prev => prev ? { ...prev, is_valid: false } : null);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      let str = "";
      if (days > 0) str += `${days}d `;
      if (hours > 0 || days > 0) str += `${hours}h `;
      str += `${minutes}m ${seconds}s`;
      
      setTimeLeft(str);
    };

    const timer = setInterval(updateTimer, 1000);
    updateTimer();

    return () => clearInterval(timer);
  }, [invitation?.expires_at, invitation?.is_valid, fetchInvitation]);

  // Revalidação periódica do convite no backend (a cada 10 segundos)
  useEffect(() => {
    if (!invitation?.is_valid || accepting) return;

    const interval = setInterval(() => {
      void fetchInvitation(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchInvitation, invitation?.is_valid, accepting]);

  const handleAccept = async () => {
    if (!isAuthenticated) {
      toast.error("Você precisa estar logado para aceitar o convite.");
      return;
    }

    if (!showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    setAccepting(true);
    try {
      const { error: e } = await supabase.rpc("accept_invitation", { _token: token });
      if (e) throw e;

      toast.success("Convite aceito com sucesso!");
      await refreshProfile();
      void navigate({ to: "/app" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao aceitar convite.");
    } finally {
      setAccepting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mb-3" />
        <h1 className="font-display text-xl font-bold mb-1">Convite inválido</h1>
        <p className="text-sm text-slate-400">{error ?? "Este convite expirou ou já foi utilizado."}</p>
        <Link to="/" className="mt-6 text-sm text-primary underline">
          Voltar para o início
        </Link>
      </div>
    );
  }

  const isInvalid = !invitation.is_valid;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white px-5 py-8 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary">
            <UserPlus className="h-6 w-6 text-white" />
          </div>
        </div>

        <Card className="border-white/10 bg-slate-900/50 backdrop-blur-xl text-white shadow-2xl overflow-hidden">
          <CardHeader className="text-center pb-2">
            <CardTitle className="font-display text-2xl font-bold">
              {showConfirmation ? "Confirmar Ingresso" : "Aceitar Convite"}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {showConfirmation 
                ? "Confirme se os dados da unidade e do seu perfil de acesso estão corretos."
                : "Você foi convidado para fazer parte da equipe."}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-4">
              <div className={`flex items-start gap-4 p-4 rounded-2xl bg-white/5 border ${showConfirmation ? 'border-primary/50 bg-primary/5' : 'border-white/10'}`}>
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/20 text-primary shrink-0">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Unidade</p>
                  <p className="text-lg font-bold text-white leading-tight">{invitation.unidade_nome}</p>
                  {invitation.unidade_endereco && (
                    <p className="text-xs text-slate-400 mt-1 italic">{invitation.unidade_endereco}</p>
                  )}
                </div>
              </div>

              <div className={`flex items-start gap-4 p-4 rounded-2xl bg-white/5 border ${showConfirmation ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10'}`}>
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-500 shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Perfil & Permissões</p>
                  <p className="text-lg font-bold text-white leading-tight">{ROLE_LABELS[invitation.role] || invitation.role}</p>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2" title={invitation.role_permissions}>
                    {invitation.role_permissions}
                  </p>
                </div>
              </div>

              {invitation.is_valid && !showConfirmation && (
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Clock className="h-4 w-4" />
                    <span>Expira em:</span>
                  </div>
                  <span className="font-mono text-primary font-bold">{timeLeft}</span>
                </div>
              )}
            </div>

            {!isAuthenticated && (
              <div className="pt-4 border-t border-white/10">
                <p className="text-sm text-center text-slate-400 mb-4">
                  Para aceitar, você precisa entrar em sua conta ou criar uma nova.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button asChild variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10">
                    <Link to="/login" search={{ redirect: `/convite/${token}` }}>Entrar</Link>
                  </Button>
                  <Button asChild className="bg-gradient-primary">
                    <Link to="/login" search={{ redirect: `/convite/${token}` }}>Criar Conta</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="bg-white/5 p-6 mt-2 flex flex-col gap-3">
            <Button 
              className="w-full bg-gradient-primary h-12 text-lg font-bold shadow-glow" 
              disabled={isInvalid || accepting || !isAuthenticated}
              onClick={handleAccept}
            >
              {accepting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isInvalid ? (
                "Convite Inválido"
              ) : !isAuthenticated ? (
                "Faça login para aceitar"
              ) : showConfirmation ? (
                "Sim, confirmar e entrar"
              ) : (
                "Aceitar e Acessar"
              )}
            </Button>
            
            {showConfirmation && !accepting && (
              <Button 
                variant="ghost" 
                className="w-full text-slate-400 hover:text-white hover:bg-white/5"
                onClick={() => setShowConfirmation(false)}
              >
                Voltar
              </Button>
            )}
          </CardFooter>
        </Card>

        <p className="mt-8 text-center text-xs text-slate-600 uppercase tracking-widest">
          FilaMed &bull; Gestão Hospitalar
        </p>
      </div>
    </div>
  );
}