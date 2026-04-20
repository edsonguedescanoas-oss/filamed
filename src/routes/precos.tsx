import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ArrowRight, Sparkles, MessageCircle, Building2, Mic2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/precos")({
  head: () => ({
    meta: [
      { title: "Preços — FilaMed | Gestão de Filas para Saúde" },
      {
        name: "description",
        content:
          "Comece com R$249/mês por unidade. Add-ons sob demanda: WhatsApp, multi-unidade, voz premium. Sem fidelidade, sem instalação complexa.",
      },
      { property: "og:title", content: "Preços simples e por unidade — FilaMed" },
      {
        property: "og:description",
        content:
          "R$249/mês por unidade com tudo essencial. Pague apenas pelos extras que usar.",
      },
    ],
  }),
  component: PrecosPage,
});

const baseFeatures = [
  "Filas ilimitadas e senhas ilimitadas/dia",
  "Painel de TV (1 tela inclusa por unidade)",
  "Chamadas por voz (browser TTS)",
  "WebApp do paciente com QR Code",
  "Dashboard em tempo real",
  "Relatórios de atendimento",
  "Multi-perfil (admin, recepção, médico, gestor)",
  "Suporte por e-mail em horário comercial",
];

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
    a: "Não. Cobrança mensal, cancelamento a qualquer momento. Você só paga pelo mês em curso.",
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
    q: "E se eu tiver uma rede com 10+ unidades?",
    a: "Acima de 5 unidades temos plano Enterprise com desconto progressivo, SLA dedicado e suporte 24/7. Fale com a gente.",
  },
];

function PrecosPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="pt-32 pb-24">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-mesh pb-16">
          <div className="mx-auto max-w-5xl px-6 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Preço simples, sem surpresa no boleto
            </span>
            <h1 className="mt-6 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Pague <span className="text-gradient">por unidade</span>, ative só o que usar
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
              Tudo essencial já vem incluso. Notificação por WhatsApp, multi-unidade e voz premium
              entram quando você quiser — sem renegociar contrato.
            </p>
          </div>
        </section>

        {/* Plano base */}
        <section className="mx-auto max-w-5xl px-6 -mt-4">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-card p-8 sm:p-12 shadow-elegant">
            <div
              aria-hidden
              className="absolute -top-24 right-0 h-64 w-64 rounded-full opacity-20 blur-3xl"
              style={{ background: "var(--gradient-primary)" }}
            />
            <div className="relative grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  Plano FilaMed
                </p>
                <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
                  R$ 249
                  <span className="text-lg font-medium text-muted-foreground">
                    {" "}
                    /mês por unidade
                  </span>
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Tudo que você precisa pra tirar a fila do papel e colocar a clínica em tempo real.
                  Sem limite de senhas, sem limite de usuários da equipe.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <Button asChild size="lg" className="bg-gradient-primary shadow-elegant group">
                    <a href="mailto:contato@filamed.app?subject=Quero%20come%C3%A7ar%20com%20o%20FilaMed">
                      Começar agora
                      <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </a>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link to="/" hash="cta">
                      Agendar demonstração
                    </Link>
                  </Button>
                </div>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {baseFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span className="text-foreground/90">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
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

        {/* Enterprise */}
        <section className="mx-auto max-w-5xl px-6 mt-20">
          <div className="rounded-3xl border border-border bg-card p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Enterprise
              </p>
              <h3 className="mt-2 font-display text-2xl font-bold">
                Redes com 5+ unidades, hospitais e operadoras
              </h3>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Desconto progressivo por unidade, SLA dedicado, integração com prontuário eletrônico
                (Tasy, Soul MV, Pixeon), SSO e suporte 24/7.
              </p>
            </div>
            <Button asChild size="lg" variant="outline" className="shrink-0">
              <a href="mailto:contato@filamed.app?subject=Enterprise%20FilaMed">Falar com vendas</a>
            </Button>
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
    </div>
  );
}
