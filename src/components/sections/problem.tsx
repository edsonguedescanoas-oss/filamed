import { AlertTriangle, Frown, Clock4, UserMinus } from "lucide-react";

const pains = [
  { icon: AlertTriangle, title: "Filas desorganizadas", text: "Senhas confusas, papéis perdidos e prioridades ignoradas." },
  { icon: Frown, title: "Pacientes irritados", text: "Sem previsibilidade, a percepção de espera dobra." },
  { icon: Clock4, title: "Tempo imprevisível", text: "Sem dados, é impossível otimizar o fluxo de atendimento." },
  { icon: UserMinus, title: "Equipe sobrecarregada", text: "Recepção opera no improviso, com retrabalho constante." },
];

export function Problem() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center reveal">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-destructive">O Problema</span>
          <h2 className="mt-3 text-3xl font-bold sm:text-5xl">
            Sua recepção ainda depende de processos manuais?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Senhas confusas, falta de controle e pacientes ansiosos drenam recursos da sua operação todos os dias.
          </p>
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {pains.map((p, i) => (
            <div
              key={p.title}
              className="reveal group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-soft"
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-destructive/5 blur-2xl transition-opacity group-hover:opacity-100" />
              <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <p.icon className="h-5 w-5" />
              </div>
              <h3 className="relative mt-5 font-display text-lg font-semibold">{p.title}</h3>
              <p className="relative mt-2 text-sm text-muted-foreground">{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
