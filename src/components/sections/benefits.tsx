import { Heart, Building, Users, ArrowRight } from "lucide-react";
import { WhatsAppFlow } from "@/components/whatsapp-flow";

const groups = [
  {
    icon: Heart,
    title: "Para Pacientes",
    accent: "from-pink-500/20 to-primary/20",
    items: ["Redução do tempo de espera", "Transparência total da fila", "Menos ansiedade", "Mobilidade — espera onde quiser", "Autonomia no atendimento"],
  },
  {
    icon: Building,
    title: "Para Clínica / Hospital",
    accent: "from-primary/20 to-primary-glow/20",
    items: ["Redução de custos operacionais", "Mais eficiência por atendente", "Menos erros de chamada", "Escalabilidade multiunidade", "Imagem moderna e tecnológica"],
  },
  {
    icon: Users,
    title: "Para a Equipe",
    accent: "from-primary-glow/20 to-emerald-400/20",
    items: ["Organização total do fluxo", "Menos estresse na recepção", "Mais produtividade", "Decisões baseadas em dados", "Onboarding rápido para novos colaboradores"],
  },
];

export function Benefits() {
  return (
    <section id="beneficios" className="relative py-24 sm:py-32 bg-gradient-mesh">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center reveal">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Benefícios</span>
          <h2 className="mt-3 text-2xl font-bold sm:text-4xl">
            Resultado que <span className="text-gradient">todos sentem</span>.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Pacientes, gestores e equipe — cada perfil ganha com o FilaMed.
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {groups.map((g, i) => (
            <div
              key={g.title}
              className="reveal group relative overflow-hidden rounded-3xl border border-border bg-card p-8 transition-all hover:-translate-y-1 hover:shadow-elegant"
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className={`absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br ${g.accent} blur-3xl opacity-70`} />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
                <g.icon className="h-7 w-7 text-primary-foreground" />
              </div>
              <h3 className="relative mt-6 font-display text-2xl font-semibold">{g.title}</h3>
              <ul className="relative mt-5 space-y-2.5">
                {g.items.map((it) => (
                  <li key={it} className="flex items-start gap-3 text-foreground/85">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-primary" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center reveal">
          <WhatsAppFlow 
            trigger={
              <button className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg hover:scale-105 transition-all">
                Garantir esses benefícios agora
                <ArrowRight className="h-5 w-5" />
              </button>
            }
          />
        </div>
      </div>
    </section>
  );
}
