import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Hero } from "@/components/sections/hero";
import { Problem } from "@/components/sections/problem";
import { Solution } from "@/components/sections/solution";
import { Features } from "@/components/sections/features";
import { Architecture } from "@/components/sections/architecture";
import { Flow } from "@/components/sections/flow";
import { Benefits } from "@/components/sections/benefits";
import { Differentials } from "@/components/sections/differentials";
import { CTA } from "@/components/sections/cta";
import { useReveal } from "@/hooks/use-reveal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FilaMed — Gestão Inteligente de Filas para Saúde" },
      {
        name: "description",
        content:
          "Plataforma SaaS de gestão inteligente de filas para clínicas e hospitais. Reduza espera, automatize chamadas e integre toda a operação.",
      },
      { property: "og:title", content: "FilaMed — Gestão Inteligente de Filas para Saúde" },
      {
        property: "og:description",
        content:
          "Filas inteligentes, notificações multicanal, painel de TV e analytics em tempo real para unidades de saúde.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  useReveal();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <Hero />
        <Problem />
        <Solution />
        <Features />
        <Architecture />
        <Flow />
        <Benefits />
        <Differentials />
        <CTA />
      </main>
      <SiteFooter />
    </div>
  );
}
