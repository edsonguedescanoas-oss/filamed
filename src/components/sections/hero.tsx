import { ArrowRight, PlayCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroMockup from "@/assets/hero-mockup.jpg";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-mesh pt-32 pb-24 sm:pt-40 sm:pb-32">
      <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
      <div
        aria-hidden
        className="absolute -top-32 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--gradient-primary)" }}
      />
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Plataforma SaaS para unidades de saúde
          </span>
          <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Transforme o atendimento da sua unidade com{" "}
            <span className="text-gradient">gestão inteligente de filas</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Filas inteligentes, notificações em tempo real, integração total e redução drástica
            de espera e caos operacional — em uma única plataforma.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-gradient-primary shadow-elegant hover:opacity-95 group">
              <a href="#cta">
                Solicitar demonstração
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="backdrop-blur">
              <a href="#fluxo">
                <PlayCircle className="mr-1 h-4 w-4" />
                Ver como funciona
              </a>
            </Button>
          </div>
          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-glow" />
              Tempo real via WebSocket
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              LGPD compliant
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-glow" />
              99.9% uptime
            </div>
          </div>
        </div>

        <div className="relative mt-16 sm:mt-20 mx-auto max-w-6xl animate-scale-in">
          <div className="absolute -inset-6 bg-gradient-primary opacity-20 blur-3xl rounded-[2rem]" />
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
            <img
              src={heroMockup}
              alt="Painel administrativo, TV de chamadas e WebApp do paciente do sistema FilaMed"
              width={1440}
              height={810}
              fetchPriority="high"
              decoding="async"
              sizes="(min-width: 1280px) 1150px, (min-width: 640px) 90vw, 100vw"
              className="w-full h-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
