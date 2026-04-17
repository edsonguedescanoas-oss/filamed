import { Server, Layout, MonitorPlay, Smartphone } from "lucide-react";

const stacks = [
  {
    icon: Server,
    title: "Backend",
    color: "from-primary to-primary-glow",
    items: ["SQLite / PostgreSQL / MySQL", "Autenticação JWT", "WebSocket em tempo real", "API REST documentada", "Algoritmos inteligentes de fila"],
  },
  {
    icon: Layout,
    title: "Frontend",
    color: "from-primary-glow to-primary",
    items: ["React.js + TypeScript", "Design 100% responsivo", "Componentes reutilizáveis", "Tema customizável por unidade"],
  },
  {
    icon: MonitorPlay,
    title: "TV / Display",
    color: "from-primary to-primary-glow",
    items: ["WebApp otimizado para telas grandes", "Modo quiosque", "Auto-start no boot", "Sincronização multi-TV"],
  },
  {
    icon: Smartphone,
    title: "Mobile (PWA)",
    color: "from-primary-glow to-primary",
    items: ["Progressive Web App", "Funciona offline", "Notificações push", "Instalação opcional na home"],
  },
];

export function Architecture() {
  return (
    <section id="arquitetura" className="relative py-24 sm:py-32 bg-gradient-mesh">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center reveal">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Arquitetura</span>
          <h2 className="mt-3 text-3xl font-bold sm:text-5xl">
            Construído com tecnologia <span className="text-gradient">enterprise-grade</span>.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Stack moderno, escalável e preparado para operações 24/7 em redes hospitalares.
          </p>
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stacks.map((s, i) => (
            <div
              key={s.title}
              className="reveal relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-soft hover:border-primary/30"
              style={{ transitionDelay: `${i * 70}ms` }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-soft">
                <s.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold">{s.title}</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {s.items.map((it) => (
                  <li key={it} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
