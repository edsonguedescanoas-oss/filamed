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
import { Segments } from "@/components/sections/segments";
import { ComoComecar } from "@/components/sections/como-comecar";
import { CTA } from "@/components/sections/cta";
import { AnalyticsShowcase } from "@/components/sections/analytics-showcase";
import { useReveal } from "@/hooks/use-reveal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FilaMed — Gestão Inteligente e Analytics para Clínicas" },
      {
        name: "description",
        content:
          "Assuma o controle total da sua clínica com relatórios inteligentes e gestão de filas de alta performance. Reduza custos e aumente o ROI.",
      },
      { property: "og:title", content: "FilaMed — Gestão Inteligente e Analytics para Clínicas" },
      {
        property: "og:description",
        content:
          "Dashboards em tempo real, KPIs operacionais e gestão automatizada para unidades de saúde modernas.",
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
        <AnalyticsShowcase />
        <Solution />
        <Features />
        {/* Architecture e Flow podem ser menos priorizados para gestores, mas mantidos */}
        <Architecture />
        <Flow />
        <Benefits />
        <Differentials />
        <ComoComecar />
        <CTA />
      </main>
      <SiteFooter />
    </div>
  );
}
