import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ArrowRight,
  Sparkles,
  MessageCircle,
  Building2,
  Mic2,
  Loader2,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { CheckoutDialog } from "@/components/checkout-dialog";
import { PaymentTestModeBanner } from "@/components/payment-test-banner";

export const Route = createFileRoute("/precos")({
  head: () => ({
    meta: [
      { title: "Preços — FilaMed | Gestão de Filas para Saúde" },
      {
        name: "description",
        content:
          "Planos a partir de R$99/mês por unidade. Mensal ou anual com 2 meses grátis. Sem fidelidade, sem instalação complexa.",
      },
      { property: "og:title", content: "Planos e preços — FilaMed" },
      {
        property: "og:description",
        content:
          "Starter, Pro e Enterprise. Pague mensal ou anual com desconto. Cancelamento a qualquer momento.",
      },
    ],
  }),
  component: PrecosPage,
});

interface PlanoRow {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  preco_mensal_centavos: number;
  preco_anual_centavos: number | null;
  moeda: string;
  limite_filas: number | null;
  limite_atendentes: number | null;
  limite_tvs: number | null;
  limite_senhas_mes: number | null;
  recursos: Record<string, boolean> | null;
  destaque: boolean;
  ordem: number;
  gateway_price_id_mensal: string | null;
  gateway_price_id_anual: string | null;
}

type Ciclo = "mensal" | "anual";

const RECURSO_LABEL: Record<string, string> = {
  whatsapp: "Notificações WhatsApp",
  voz_premium: "Voz premium (ElevenLabs/Google)",
  relatorios_avancados: "Relatórios avançados",
  suporte_prioritario: "Suporte prioritário 24/7",
  sso: "Login único (SSO)",
  api: "API REST + Webhooks",
};

const addOns = [
  {
    icon: MessageCircle,
    name: "Notificações WhatsApp",
    price: "R$149",
    unit: "/mês por unidade",
    desc: "Avisa o paciente quando for chamado e quando estiver chegando a vez dele.",
  },
  {
    icon: Building2,
    name: "Multi-unidade",
    price: "R$99",
    unit: "/mês por unidade adicional",
    desc: "Visão consolidada de várias clínicas no mesmo painel de gestor.",
  },
  {
    icon: Mic2,
    name: "Voz premium (ElevenLabs/Google)",
    price: "R$79",
    unit: "/mês por unidade",
    desc: "Vozes naturais com cache inteligente. Inclui 30k caracteres/mês.",
  },
];

const faqs = [
  {
    q: "Tem fidelidade ou multa por cancelamento?",
    a: "Não. Cobrança mensal ou anual à sua escolha, cancelamento a qualquer momento. No anual, devolvemos os meses não utilizados pro-rata.",
  },
  {
    q: "Quanto tempo leva pra colocar no ar?",
    a: "Em média 1 dia útil. O cadastro da unidade leva 5 minutos, configurar filas mais 10 minutos, e a TV roda em qualquer Smart TV ou navegador.",
  },
  {
    q: "Como funciona a LGPD?",
    a: "Dados ficam em servidores no Brasil, com criptografia em repouso e em trânsito. Cada unidade só enxerga seus próprios pacientes (Row-Level Security). Fornecemos termo de adequação e DPA sob solicitação.",
  },
  {
    q: "Integra com meu prontuário eletrônico?",
    a: "Sim. Temos API REST e webhooks para entrada/saída de pacientes, status de senhas e atendimentos. Integrações específicas (Tasy, Soul MV, Pixeon) entram no plano Enterprise.",
  },
  {
    q: "Preciso comprar TV ou hardware especial?",
    a: "Não. Funciona em qualquer Smart TV com navegador, Chromecast, Fire TV ou um PC antigo ligado a uma TV. Senha é texto, não exige impressora térmica (mas suportamos se quiser).",
  },
  {
    q: "Posso mudar de plano depois?",
    a: "Sim. Faz upgrade ou downgrade a qualquer momento pelo painel — a cobrança é ajustada pro-rata no ciclo seguinte.",
  },
];

function fmtMoeda(centavos: number, moeda = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: moeda,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(centavos / 100);
}

function buildFeatures(plano: PlanoRow): string[] {
  const out: string[] = [];

  out.push(plano.limite_filas === null ? "Filas ilimitadas" : `Até ${plano.limite_filas} filas`);
  out.push(
    plano.limite_atendentes === null
      ? "Atendentes ilimitados"
      : `Até ${plano.limite_atendentes} atendentes`,
  );
  out.push(
    plano.limite_tvs === null
      ? "Painéis de TV ilimitados"
      : `${plano.limite_tvs} ${plano.limite_tvs === 1 ? "painel" : "painéis"} de TV`,
  );
  out.push(
    plano.limite_senhas_mes === null
      ? "Senhas ilimitadas/mês"
      : `${plano.limite_senhas_mes.toLocaleString("pt-BR")} senhas/mês`,
  );

  const recursos = plano.recursos ?? {};
  for (const [chave, ativo] of Object.entries(recursos)) {
    if (ativo && RECURSO_LABEL[chave]) out.push(RECURSO_LABEL[chave]);
  }

  return out;
}

function PrecosPage() {
  const [planos, setPlanos] = useState<PlanoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [ciclo, setCiclo] = useState<Ciclo>("mensal");
  const [checkoutPriceId, setCheckoutPriceId] = useState<string | null>(null);
  const [checkoutPlano, setCheckoutPlano] = useState<PlanoRow | null>(null);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      const { data, error } = await supabase
        .from("planos")
        .select(
          "id, slug, nome, descricao, preco_mensal_centavos, preco_anual_centavos, moeda, limite_filas, limite_atendentes, limite_tvs, limite_senhas_mes, recursos, destaque, ordem, gateway_price_id_mensal, gateway_price_id_anual",
        )
        .eq("ativo", true)
        .order("ordem", { ascending: true });
      if (cancel) return;
      if (error) {
        console.error("Erro ao carregar planos:", error);
      } else {
        setPlanos((data ?? []) as PlanoRow[]);
      }
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const handleAssinar = (plano: PlanoRow) => {
    const priceId =
      ciclo === "anual" ? plano.gateway_price_id_anual : plano.gateway_price_id_mensal;
    if (!priceId) {
      console.error("Plano sem price_id configurado:", plano.slug, ciclo);
      return;
    }
    setCheckoutPlano(plano);
    setCheckoutPriceId(priceId);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PaymentTestModeBanner />
      <SiteHeader />
      <main className="pt-32 pb-24">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-mesh pb-12">
          <div className="mx-auto max-w-5xl px-6 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Sem fidelidade. Cancele quando quiser.
            </span>
            <h1 className="mt-6 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Escolha o plano <span className="text-gradient">da sua clínica</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
              Comece grátis com 14 dias de trial. Mude de plano quando quiser, sem multa.
              No anual, ganhe 2 meses grátis.
            </p>

            <CicloToggle ciclo={ciclo} onChange={setCiclo} />
          </div>
        </section>

        {/* Cards de planos */}
        <section className="mx-auto max-w-6xl px-6 -mt-2">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : planos.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              Nenhum plano disponível no momento.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {planos.map((p) => (
                <PlanoCard key={p.id} plano={p} ciclo={ciclo} onAssinar={handleAssinar} />
              ))}
            </div>
          )}
        </section>

        {/* Add-ons */}
        <section className="mx-auto max-w-5xl px-6 mt-20">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Add-ons opcionais
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
              Cresça quando fizer sentido
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Ative um add-on em segundos pelo painel. Cobrança proporcional ao mês.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {addOns.map(({ icon: Icon, name, price, unit, desc }) => (
              <div
                key={name}
                className="rounded-2xl border border-border bg-card p-6 hover:border-primary/40 hover:shadow-soft transition"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                <div className="mt-5 border-t border-border pt-4">
                  <span className="font-display text-2xl font-bold">{price}</span>
                  <span className="text-sm text-muted-foreground">{unit}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-6 mt-24">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Perguntas frequentes
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
              Tirou dúvida, fechou.
            </h2>
          </div>
          <Accordion type="single" collapsible className="mt-10">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-border">
                <AccordionTrigger className="text-left text-base font-medium">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* CTA final */}
        <section className="mx-auto max-w-5xl px-6 mt-24">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-primary p-10 sm:p-14 text-center shadow-elegant">
            <h2 className="font-display text-3xl font-bold text-primary-foreground sm:text-4xl">
              Tire a fila do papel hoje.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
              Demonstração de 30 minutos. Saímos do zero ao ar no mesmo dia.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" variant="secondary" className="group shadow-soft">
                <a href="mailto:contato@filamed.app?subject=Demonstra%C3%A7%C3%A3o%20FilaMed">
                  Agendar demonstração
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Link to="/casos">Ver casos de uso</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />

      <CheckoutDialog
        open={!!checkoutPriceId}
        onClose={() => {
          setCheckoutPriceId(null);
          setCheckoutPlano(null);
        }}
        priceId={checkoutPriceId}
        planoNome={checkoutPlano?.nome}
        ciclo={ciclo}
      />
    </div>
  );
}

function CicloToggle({ ciclo, onChange }: { ciclo: Ciclo; onChange: (c: Ciclo) => void }) {
  return (
    <div className="mt-10 inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-soft">
      <button
        type="button"
        onClick={() => onChange("mensal")}
        className={cn(
          "rounded-full px-5 py-2 text-sm font-medium transition-colors",
          ciclo === "mensal"
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Mensal
      </button>
      <button
        type="button"
        onClick={() => onChange("anual")}
        className={cn(
          "rounded-full px-5 py-2 text-sm font-medium transition-colors",
          ciclo === "anual"
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Anual
        <span
          className={cn(
            "ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold",
            ciclo === "anual"
              ? "bg-background/20 text-background"
              : "bg-primary/10 text-primary",
          )}
        >
          2 meses grátis
        </span>
      </button>
    </div>
  );
}

function PlanoCard({
  plano,
  ciclo,
  onAssinar,
}: {
  plano: PlanoRow;
  ciclo: Ciclo;
  onAssinar: (p: PlanoRow) => void;
}) {
  const features = useMemo(() => buildFeatures(plano), [plano]);

  const precoMensalEquiv =
    ciclo === "anual" && plano.preco_anual_centavos
      ? Math.round(plano.preco_anual_centavos / 12)
      : plano.preco_mensal_centavos;

  const precoTotal =
    ciclo === "anual" && plano.preco_anual_centavos
      ? plano.preco_anual_centavos
      : plano.preco_mensal_centavos;

  const priceConfigured =
    ciclo === "anual" ? !!plano.gateway_price_id_anual : !!plano.gateway_price_id_mensal;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-3xl border bg-card p-8 transition",
        plano.destaque
          ? "border-primary/50 shadow-elegant ring-1 ring-primary/30"
          : "border-border hover:border-primary/30 hover:shadow-soft",
      )}
    >
      {plano.destaque && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-soft">
          Mais popular
        </span>
      )}

      <div className="flex-1">
        <h3 className="font-display text-2xl font-bold">{plano.nome}</h3>
        {plano.descricao && (
          <p className="mt-2 text-sm text-muted-foreground">{plano.descricao}</p>
        )}

        <div className="mt-6">
          <div className="flex items-baseline gap-1">
            <span className="font-display text-4xl font-bold">
              {fmtMoeda(precoMensalEquiv, plano.moeda)}
            </span>
            <span className="text-sm text-muted-foreground">/mês</span>
          </div>
          {ciclo === "anual" && plano.preco_anual_centavos ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {fmtMoeda(precoTotal, plano.moeda)}/ano · cobrado anualmente
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              cobrado mensalmente por unidade
            </p>
          )}
        </div>

        <ul className="mt-6 space-y-3">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-3 text-sm">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              <span className="text-foreground/90">{f}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8">
        {plano.slug === "enterprise" ? (
          <Button asChild size="lg" variant="outline" className="w-full">
            <a href="mailto:contato@filamed.app?subject=Enterprise%20FilaMed">Falar com vendas</a>
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            disabled={!priceConfigured}
            onClick={() => onAssinar(plano)}
            className={cn(
              "w-full group",
              plano.destaque && "bg-gradient-primary shadow-elegant",
            )}
            variant={plano.destaque ? "default" : "outline"}
          >
            Começar trial de 14 dias
            <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
