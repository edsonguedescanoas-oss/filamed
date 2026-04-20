import { Link } from "@tanstack/react-router";
import { AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrialStatus } from "@/hooks/use-auth";

interface TrialBannerProps {
  trial: TrialStatus;
}

/**
 * Banner fino exibido no topo do /app quando a unidade está em trial.
 * Esconde quando já é assinante ativo. Para expirado/suspenso usamos a
 * tela de bloqueio (TrialBlocked), não este banner.
 */
export function TrialBanner({ trial }: TrialBannerProps) {
  if (trial.status_assinatura !== "trial" || trial.expirado) return null;

  const dias = trial.dias_restantes;
  const urgente = dias <= 3;

  return (
    <div
      className={cn(
        "border-b text-sm",
        urgente
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-primary/20 bg-primary/5 text-primary",
      )}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6">
        <div className="flex items-center gap-2">
          {urgente ? <AlertCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
          <span className="font-medium">
            {dias === 0
              ? "Seu trial expira hoje"
              : dias === 1
                ? "Resta 1 dia de trial"
                : `Restam ${dias} dias de trial`}
          </span>
        </div>
        <Link
          to="/precos"
          className="font-semibold underline-offset-4 hover:underline"
        >
          Assinar agora →
        </Link>
      </div>
    </div>
  );
}
