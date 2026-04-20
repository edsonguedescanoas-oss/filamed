import { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Lock, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRecurso } from "@/hooks/use-recurso";
import { cn } from "@/lib/utils";

interface RecursoGateProps {
  /** Chave do recurso em `planos.recursos` (ex: "whatsapp", "voz_premium"). */
  recurso: string;
  /** Conteúdo liberado quando o plano permite. */
  children: ReactNode;
  /** Título do upsell. Ex: "Voz premium". */
  titulo: string;
  /** Descrição curta do que o recurso faz. */
  descricao: string;
  /** Lista de benefícios mostrada no card de upsell. */
  beneficios?: string[];
  /**
   * Modo de bloqueio:
   *  - "card": mostra um card de upsell completo no lugar do conteúdo (default)
   *  - "inline": mostra um banner pequeno + filhos desabilitados
   *  - "hidden": esconde totalmente o conteúdo
   */
  modo?: "card" | "inline" | "hidden";
  /** Classe extra para o wrapper. */
  className?: string;
}

export function RecursoGate({
  recurso,
  children,
  titulo,
  descricao,
  beneficios,
  modo = "card",
  className,
}: RecursoGateProps) {
  const { liberado, loading, planoNome } = useRecurso(recurso);

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-8 text-muted-foreground", className)}>
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (liberado) return <>{children}</>;
  if (modo === "hidden") return null;

  if (modo === "inline") {
    return (
      <div className={cn("space-y-3", className)}>
        <UpgradeBanner titulo={titulo} descricao={descricao} planoNome={planoNome} />
        <div className="pointer-events-none select-none opacity-50">{children}</div>
      </div>
    );
  }

  // modo === "card"
  return (
    <Card
      className={cn(
        "overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-primary-glow/5",
        className,
      )}
    >
      <CardContent className="flex flex-col items-start gap-5 p-6 sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Lock className="h-6 w-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Recurso premium
            </span>
          </div>
          <h3 className="mt-2 font-display text-2xl font-bold sm:text-3xl">{titulo}</h3>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">{descricao}</p>
        </div>

        {beneficios && beneficios.length > 0 && (
          <ul className="space-y-1.5 text-sm">
            {beneficios.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {b}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button asChild size="lg" className="bg-gradient-primary shadow-elegant">
            <Link to="/precos">
              Fazer upgrade
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          {planoNome && (
            <p className="text-xs text-muted-foreground">
              Seu plano atual: <strong>{planoNome}</strong>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function UpgradeBanner({
  titulo,
  descricao,
  planoNome,
}: {
  titulo: string;
  descricao: string;
  planoNome: string | null;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Lock className="h-5 w-5 shrink-0 text-primary" />
        <div className="text-sm">
          <p className="font-semibold">{titulo} não está no seu plano</p>
          <p className="text-muted-foreground">
            {descricao}
            {planoNome && <> · Plano atual: <strong>{planoNome}</strong></>}
          </p>
        </div>
      </div>
      <Button asChild size="sm" variant="default">
        <Link to="/precos">
          Fazer upgrade
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
