import { CheckCircle2 } from "lucide-react";

const highlights = [
  "Automação completa do fluxo de pacientes",
  "Múltiplos canais de entrada na fila",
  "Controle e visibilidade em tempo real",
  "Integração nativa com sistemas existentes",
];

export function Solution() {
  return (
    <section className="relative py-24 sm:py-32 bg-gradient-mesh">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="reveal">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">A Solução</span>
            <h2 className="mt-3 text-3xl font-bold sm:text-5xl leading-tight">
              Um sistema inteligente que organiza, automatiza e <span className="text-gradient">acelera</span> o atendimento.
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              O FilaMed centraliza toda a jornada do paciente — da entrada à alta — com algoritmos
              de priorização, notificações multicanal e analytics em tempo real.
            </p>
            <ul className="mt-8 space-y-3">
              {highlights.map((h) => (
                <li key={h} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary shrink-0" />
                  <span className="text-foreground/90">{h}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="reveal relative">
            <div className="absolute -inset-8 rounded-3xl bg-gradient-primary opacity-20 blur-3xl" />
            <div className="relative grid grid-cols-2 gap-4">
              {[
                { k: "−68%", v: "Tempo de espera" },
                { k: "+42%", v: "Throughput diário" },
                { k: "94%", v: "Satisfação do paciente" },
                { k: "24/7", v: "Operação sem ruptura" },
              ].map((stat) => (
                <div key={stat.v} className="glass rounded-2xl p-6 shadow-soft">
                  <div className="font-display text-4xl font-bold text-gradient">{stat.k}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{stat.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
