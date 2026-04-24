import { ArrowRight, PlayCircle, Sparkles, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppFlow } from "@/components/whatsapp-flow";
import heroMockup from "@/assets/hero-mockup.jpg";
import heroMockupWebp from "@/assets/hero-mockup.webp";
import heroMockupAvif from "@/assets/hero-mockup.avif";

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
        <div className="mx-auto max-w-4xl text-center animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            A solução definitiva para clínicas e negócios com fluxo de atendimento
          </span>
          <h1 className="mt-8 font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
            Pare de perder dinheiro com <br className="hidden sm:block" />
            <span className="text-gradient">filas invisíveis</span> e falta de dados
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg text-muted-foreground sm:text-2xl leading-relaxed">
            Tenha o controle total da produtividade da sua equipe e da satisfação dos clientes com relatórios estratégicos que mostram onde seu negócio está perdendo eficiência.
          </p>
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <WhatsAppFlow />
            <Button asChild size="lg" variant="outline" className="h-14 px-10 backdrop-blur text-lg hover:bg-primary/5 transition-colors rounded-xl">
              <a href="#analytics">
                <BarChart3 className="mr-2 h-5 w-5 text-primary" />
                Ver Relatórios
              </a>
            </Button>
          </div>
            <Button asChild size="lg" variant="outline" className="h-14 px-10 backdrop-blur text-lg hover:bg-primary/5 transition-colors rounded-xl">
              <a href="#analytics">
                <BarChart3 className="mr-2 h-5 w-5 text-primary" />
                Ver Relatórios
              </a>
            </Button>
          </div>
          <div className="mt-10 flex items-center justify-center gap-6 text-xs text-muted-foreground font-medium">
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
              ROI Comprovado
            </div>
          </div>
        </div>

        <div className="relative mt-16 sm:mt-24 mx-auto max-w-6xl animate-scale-in">
          <div className="absolute -inset-6 bg-gradient-primary opacity-20 blur-3xl rounded-[2rem]" />
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-elegant">
            <picture>
              <source type="image/avif" srcSet={heroMockupAvif} />
              <source type="image/webp" srcSet={heroMockupWebp} />
              <img
                src={heroMockup}
                alt="Painel administrativo, TV de chamadas e WebApp do paciente do sistema FilaMed"
                width={1376}
                height={768}
                fetchPriority="high"
                decoding="async"
                sizes="(min-width: 1280px) 1150px, (min-width: 640px) 90vw, 100vw"
                className="w-full h-auto"
              />
            </picture>
          </div>
        </div>
      </div>
    </section>
  );
}
