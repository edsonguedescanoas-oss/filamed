import { AlertTriangle, Frown, Clock4, UserMinus, TrendingDown, DollarSign } from "lucide-react";

const pains = [
  { 
    icon: DollarSign, 
    title: "Vazamento de Receita", 
    text: "Pacientes que desistem da espera são lucros que nunca entram no seu caixa." 
  },
  { 
    icon: TrendingDown, 
    title: "Baixa Produtividade", 
    text: "Sem métricas, sua equipe opera abaixo do potencial e você não sabe o porquê." 
  },
  { 
    icon: AlertTriangle, 
    title: "Decisões no Escuro", 
    text: "Gerir sem dados é como pilotar um avião sem instrumentos — o risco é constante." 
  },
  { 
    icon: Frown, 
    title: "Dano Reputacional", 
    text: "Uma experiência de espera ruim destrói anos de construção de marca da sua clínica." 
  },
];

export function Problem() {
  return (
    <section className="relative py-24 sm:py-32 bg-muted/30">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center reveal">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-destructive">O Custo da Ineficiência</span>
          <h2 className="mt-3 text-3xl font-bold sm:text-5xl font-display">
            Sua clínica está perdendo dinheiro <br className="hidden sm:block" /> e você nem percebeu.
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            A desorganização da recepção não é apenas um incômodo — é um gargalo financeiro que drena recursos e afasta seus melhores pacientes.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {pains.map((p, i) => (
            <div
              key={p.title}
              className="reveal group relative overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all hover:-translate-y-1 hover:shadow-soft hover:border-destructive/20"
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-destructive/5 blur-2xl transition-opacity group-hover:opacity-100" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <p.icon className="h-6 w-6" />
              </div>
              <h3 className="relative mt-6 font-display text-xl font-semibold">{p.title}</h3>
              <p className="relative mt-3 text-sm text-muted-foreground leading-relaxed">{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
