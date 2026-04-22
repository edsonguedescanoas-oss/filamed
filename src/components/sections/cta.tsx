import { ArrowRight, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTA() {
  return (
    <section id="cta" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="relative overflow-hidden rounded-[2rem] border border-border bg-gradient-primary p-10 sm:p-16 text-center shadow-elegant">
          <div aria-hidden className="absolute inset-0 opacity-30" style={{
            backgroundImage: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.25) 0%, transparent 45%)",
          }} />
          <div className="relative mx-auto max-w-3xl">
            <h2 className="font-display text-2xl font-bold leading-tight text-primary-foreground sm:text-4xl">
              Pronto para eliminar filas caóticas e transformar seu atendimento?
            </h2>
            <p className="mt-5 text-lg text-primary-foreground/85">
              Agende uma demonstração gratuita e veja o FilaMed em ação na sua unidade em menos de 30 minutos.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" variant="secondary" className="group shadow-soft">
                <a href="mailto:contato@filamed.app?subject=Quero%20uma%20demonstra%C3%A7%C3%A3o">
                  Agendar demonstração
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <a href="tel:+5500000000000">
                  <Phone className="mr-1 h-4 w-4" />
                  Falar com especialista
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
