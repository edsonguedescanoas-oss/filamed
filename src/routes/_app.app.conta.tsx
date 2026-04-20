import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CreditCard,
  Sparkles,
  Calendar,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Receipt,
  Building2,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { usePlanoAtual } from "@/hooks/use-plano-atual";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type FaturaStatus = Database["public"]["Enums"]["fatura_status"];

export const Route = createFileRoute("/_app/app/conta")({
  head: () => ({
    meta: [{ title: "Minha conta — FilaMed" }],
  }),
  component: ContaPage,
});

interface FaturaRow {
  id: string;
  numero: string;
  linha_descricao: string;
  valor_centavos: number;
  moeda: string;
  status: FaturaStatus;
  vencimento: string;
  paga_em: string | null;
  url_recibo: string | null;
}

const RECURSO_LABEL: Record<string, string> = {
  whatsapp: "Notificações WhatsApp",
  voz_premium: "Voz premium (ElevenLabs/Google)",
  relatorios_avancados: "Relatórios avançados",
  suporte_prioritario: "Suporte prioritário 24/7",
  sso: "Login único (SSO)",
  api: "API REST + Webhooks",
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  trialing: { label: "Trial", className: "bg-primary/10 text-primary border-primary/20" },
  ativa: { label: "Ativa", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  inadimplente: { label: "Inadimplente", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  cancelada: { label: "Cancelada", className: "bg-destructive/10 text-destructive border-destructive/20" },
  pausada: { label: "Pausada", className: "bg-muted text-muted-foreground" },
};

const FATURA_BADGE: Record<FaturaStatus, { label: string; className: string }> = {
  aberta: { label: "Aberta", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  paga: { label: "Paga", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  falhou: { label: "Falhou", className: "bg-destructive/10 text-destructive border-destructive/20" },
  reembolsada: { label: "Reembolsada", className: "bg-muted text-muted-foreground" },
  cancelada: { label: "Cancelada", className: "bg-muted text-muted-foreground" },
};

function fmtMoeda(centavos: number, moeda = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: moeda,
  }).format(centavos / 100);
}

function fmtData(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function ContaPage() {
  const { profile, trial } = useAuth();
  const { plano, loading: loadingPlano } = usePlanoAtual(profile?.unidade_id);
  const [faturas, setFaturas] = useState<FaturaRow[]>([]);
  const [loadingFaturas, setLoadingFaturas] = useState(true);
  const [openingPortal, setOpeningPortal] = useState(false);

  const handleOpenPortal = async () => {
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: {
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/app/conta`,
        },
      });
      if (error || !data?.url) {
        throw new Error(error?.message || "Falha ao abrir o portal");
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e.message || "Não foi possível abrir o portal de gerenciamento.");
    } finally {
      setOpeningPortal(false);
    }
  };

  useEffect(() => {
    const unidadeId = profile?.unidade_id;
    if (!unidadeId) return;
    let cancel = false;
    void (async () => {
      const { data, error } = await supabase
        .from("faturas")
        .select(
          "id, numero, linha_descricao, valor_centavos, moeda, status, vencimento, paga_em, url_recibo",
        )
        .eq("unidade_id", unidadeId)
        .order("vencimento", { ascending: false })
        .limit(10);
      if (cancel) return;
      if (!error) setFaturas((data ?? []) as FaturaRow[]);
      setLoadingFaturas(false);
    })();
    return () => {
      cancel = true;
    };
  }, [profile?.unidade_id]);

  const recursosAtivos = plano?.recursos
    ? Object.entries(plano.recursos).filter(([, v]) => v).map(([k]) => k)
    : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Minha conta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Plano, assinatura e histórico de faturas da sua unidade.
        </p>
      </div>

      {/* Card do plano atual */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-mesh p-6 sm:p-8">
          {loadingPlano ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : plano ? (
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Plano atual
                  </span>
                </div>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <h2 className="font-display text-3xl font-bold sm:text-4xl">
                    {plano.plano_nome}
                  </h2>
                  <Badge
                    variant="outline"
                    className={cn(STATUS_BADGE[plano.status]?.className)}
                  >
                    {STATUS_BADGE[plano.status]?.label ?? plano.status}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Cobrança {plano.ciclo === "anual" ? "anual" : "mensal"}
                  </Badge>
                </div>
                {plano.proximo_ciclo_em && (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Próximo ciclo em <strong>{fmtData(plano.proximo_ciclo_em)}</strong>
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleOpenPortal}
                    disabled={openingPortal}
                  >
                    {openingPortal ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Settings className="h-4 w-4" />
                    )}
                    Gerenciar assinatura
                  </Button>
                  <Button asChild size="lg" className="bg-gradient-primary shadow-elegant">
                    <Link to="/precos">
                      Trocar de plano
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground text-right max-w-[260px]">
                  Cancele, troque o cartão ou baixe faturas no portal seguro do Stripe.
                </p>
              </div>
            </div>
          ) : (
            // Sem assinatura cadastrada — mostra estado de trial puro
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Sem plano contratado
                  </span>
                </div>
                <h2 className="font-display text-3xl font-bold sm:text-4xl">
                  {trial?.status_assinatura === "trial" ? "Período de avaliação" : "Sem plano"}
                </h2>
                {trial?.status_assinatura === "trial" && !trial.expirado && (
                  <p className="text-sm text-muted-foreground">
                    Você está no trial gratuito.{" "}
                    <strong>{trial.dias_restantes} {trial.dias_restantes === 1 ? "dia restante" : "dias restantes"}</strong>{" "}
                    até {fmtData(trial.trial_ends_at)}.
                  </p>
                )}
              </div>
              <Button asChild size="lg" className="bg-gradient-primary shadow-elegant">
                <Link to="/precos">
                  Ver planos
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* Limites e recursos */}
        {plano && (
          <CardContent className="pt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-3 text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Limites do plano
                </h3>
                <dl className="space-y-2 text-sm">
                  <LimiteRow label="Filas" valor={plano.limite_filas} />
                  <LimiteRow label="Atendentes" valor={plano.limite_atendentes} />
                  <LimiteRow label="TVs (painéis)" valor={plano.limite_tvs} />
                  <LimiteRow label="Senhas / mês" valor={plano.limite_senhas_mes} />
                </dl>
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  Recursos inclusos
                </h3>
                {recursosAtivos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum recurso adicional ativo neste plano.
                  </p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {recursosAtivos.map((r) => (
                      <li key={r} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        {RECURSO_LABEL[r] ?? r}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Aviso trial expirado / inadimplência */}
      {trial?.expirado && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-destructive">
                {trial.status_assinatura === "trial"
                  ? "Seu trial expirou"
                  : `Assinatura ${trial.status_assinatura}`}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Para continuar usando o FilaMed, contrate um plano agora.
              </p>
            </div>
            <Button asChild>
              <Link to="/precos">Ver planos</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Faturas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Histórico de faturas
          </CardTitle>
          <CardDescription>Últimas 10 cobranças desta unidade</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingFaturas ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : faturas.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-10 text-center">
              <CreditCard className="mx-auto h-8 w-8 text-muted-foreground/60" />
              <p className="mt-3 text-sm font-medium">Nenhuma fatura ainda</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Suas cobranças aparecerão aqui após a contratação de um plano.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {faturas.map((f) => {
                const badge = FATURA_BADGE[f.status];
                return (
                  <li key={f.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{f.linha_descricao}</span>
                        <Badge variant="outline" className={cn("text-[10px]", badge.className)}>
                          {badge.label}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Nº {f.numero} · venc. {fmtData(f.vencimento)}
                        {f.paga_em && ` · paga em ${fmtData(f.paga_em)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-semibold text-sm">
                        {fmtMoeda(f.valor_centavos, f.moeda)}
                      </span>
                      {f.url_recibo && (
                        <Button asChild size="sm" variant="ghost">
                          <a href={f.url_recibo} target="_blank" rel="noreferrer">
                            Recibo
                          </a>
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Separator />
      <p className="text-center text-xs text-muted-foreground">
        Precisa de ajuda? Fale com a gente em{" "}
        <a href="mailto:contato@filamed.app" className="underline hover:text-foreground">
          contato@filamed.app
        </a>
      </p>
    </div>
  );
}

function LimiteRow({ label, valor }: { label: string; valor: number | null }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 py-1.5 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">
        {valor === null ? (
          <span className="text-emerald-600 dark:text-emerald-400">Ilimitado</span>
        ) : (
          valor.toLocaleString("pt-BR")
        )}
      </dd>
    </div>
  );
}
