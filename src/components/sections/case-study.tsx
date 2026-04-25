import { Clock, CheckCircle2, Zap, ArrowRight, Quote } from "lucide-react";

export function CaseStudy() {
  return (
    <section id="estudo-caso" className="py-24 bg-muted/20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="reveal mb-12">
          <span className="text-primary font-bold text-sm uppercase tracking-widest">Estudo de Caso</span>
          <h2 className="text-3xl font-bold sm:text-4xl mt-2 font-display">
            A transformação do <span className="italic">Pronto Atendimento Central</span>.
          </h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="glass p-8 rounded-3xl border border-border reveal shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive mb-6">
              <Clock className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold mb-4">O Desafio</h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              Com média de 400 pacientes/dia, a clínica sofria com recepções lotadas e uma taxa de desistência de 18% devido à demora excessiva.
            </p>
            <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/10">
              <p className="text-[10px] font-bold text-destructive uppercase mb-1">Impacto Financeiro</p>
              <p className="text-sm font-bold">R$ 45.000/mês perdidos em desistências</p>
            </div>
          </div>

          <div className="glass p-8 rounded-3xl border border-primary/20 bg-primary/5 reveal shadow-md hover:shadow-lg transition-all scale-105 z-10">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold mb-4">A Solução</h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              Implementação do ecossistema FilaMed: Triagem digital, painéis de TV informativos e dashboards de gestão em tempo real.
            </p>
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <p className="text-[10px] font-bold text-primary uppercase mb-1">Implementação</p>
              <p className="text-sm font-bold">Setup completo em menos de 7 dias</p>
            </div>
          </div>

          <div className="glass p-8 rounded-3xl border border-border reveal shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center text-success mb-6">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold mb-4">Os Números</h3>
            <ul className="space-y-3 text-sm text-muted-foreground mb-4">
              <li className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-success" />
                <span className="font-bold text-foreground">-45% tempo de espera (28 min p/ 15 min)</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-success" />
                <span className="font-bold text-foreground">-85% na taxa de abandono de fichas</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-success" />
                <span className="font-bold text-foreground">+20% de produtividade médica</span>
              </li>
            </ul>
            <div className="p-3 rounded-xl bg-success/10 border border-success/20">
              <p className="text-[10px] font-bold text-success uppercase mb-1">ROI Real</p>
              <p className="text-sm font-bold">Payback total em apenas 45 dias</p>
            </div>
          </div>
        </div>

        <div className="mt-16 reveal">
          <div className="glass p-8 rounded-3xl border border-border flex flex-col md:flex-row items-center gap-8">
            <div className="w-24 h-24 rounded-full bg-muted border-4 border-background shadow-lg flex-shrink-0 overflow-hidden">
               <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary-glow/20 flex items-center justify-center">
                  <Quote className="h-8 w-8 text-primary/40" />
               </div>
            </div>
            <div className="flex-1">
              <p className="text-lg italic text-muted-foreground leading-relaxed">
                "O maior ganho não foi apenas a velocidade, mas a paz na recepção. O paciente sabe quanto tempo vai esperar, e nossa equipe trabalha focada, sem a pressão de uma sala lotada e desorganizada."
              </p>
              <div className="mt-4">
                <p className="font-bold text-foreground">Dr. Ricardo Almeida</p>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Diretor Médico · Unidade Central</p>
              </div>
            </div>
            <button className="flex-shrink-0 flex items-center gap-2 text-primary font-bold group">
              Ler caso completo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
