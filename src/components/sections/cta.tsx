import { ArrowRight, Calendar, Sparkles, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppFlow } from "@/components/whatsapp-flow";

export function CTA() {
  return (
    <section id="cta" className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
      <div className="mx-auto max-w-7xl px-6 relative">
        <div className="relative isolate overflow-hidden bg-foreground rounded-[3rem] px-6 py-20 shadow-2xl sm:px-24 sm:py-28 text-center reveal">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/20 rounded-full blur-[100px]" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary-glow/20 rounded-full blur-[100px]" />
          
          <div className="relative z-10 mx-auto max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-primary mb-8">
              <Sparkles className="h-3.5 w-3.5" />
              Upgrade sua clínica hoje
            </span>
            <h2 className="text-4xl font-bold tracking-tight text-white sm:text-6xl font-display leading-tight">
              Sua gestão merece a <br />
              <span className="text-primary italic">melhor inteligência.</span>
            </h2>
            <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-slate-300">
              Junte-se a centenas de gestores que transformaram o caos da recepção em uma operação lucrativa e de alta performance.
            </p>
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
              <WhatsAppFlow />
              <Button asChild size="lg" variant="outline" className="h-16 px-10 border-white/20 text-white hover:bg-white/10 backdrop-blur text-xl rounded-2xl w-full sm:w-auto">
                <a href="#como-funciona">
                  <PlayCircle className="mr-2 h-5 w-5 text-primary" />
                  Ver Como Funciona
                </a>
              </Button>
            </div>
            <p className="mt-10 text-xs text-slate-500 font-medium uppercase tracking-[0.2em]">
              Implementação em até 48h · Suporte Vitalício · LGPD Garantida
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
