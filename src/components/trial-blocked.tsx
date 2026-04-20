import { Link } from "@tanstack/react-router";
import { Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth, type TrialStatus } from "@/hooks/use-auth";

interface TrialBlockedProps {
  trial: TrialStatus;
}

const TITLES: Record<TrialStatus["status_assinatura"], string> = {
  trial: "Período de trial encerrado",
  ativo: "Acesso temporariamente indisponível",
  suspenso: "Conta suspensa",
  cancelado: "Assinatura cancelada",
};

const MESSAGES: Record<TrialStatus["status_assinatura"], string> = {
  trial: "Seu período gratuito de 14 dias acabou. Para continuar usando o FilaMed, escolha um plano.",
  ativo: "Houve um problema com sua assinatura. Entre em contato com o suporte.",
  suspenso: "Sua conta foi suspensa. Entre em contato com nosso suporte para regularizar.",
  cancelado: "Sua assinatura foi cancelada. Reative para voltar a usar o FilaMed.",
};

export function TrialBlocked({ trial }: TrialBlockedProps) {
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <Lock className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl">{TITLES[trial.status_assinatura]}</CardTitle>
          <CardDescription>{MESSAGES[trial.status_assinatura]}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild size="lg">
            <Link to="/precos">Ver planos</Link>
          </Button>
          <Button asChild variant="outline">
            <a href="mailto:contato@filamed.com.br">
              <Mail className="h-4 w-4" />
              Falar com suporte
            </a>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
