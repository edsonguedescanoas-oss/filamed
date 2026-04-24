import { CheckCircle2, ShieldCheck, Zap, BarChart3, TrendingUp } from "lucide-react";

const highlights = [
  "Gestão baseada em KPIs de saúde",
  "Otimização de custos operacionais",
  "Aumento real no volume de atendimentos",
  "Fidelização via experiência premium",
];

export function Solution() {
  return (
    <section className="relative py-24 sm:py-32 bg-gradient-mesh overflow-hidden">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          <div className="reveal">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">A Solução Estratégica</span>
            <h2 className="mt-4 text-3xl font-bold sm:text-5xl leading-tight font-display">
              Mais que um gerenciador de senhas, um <span className="text-gradient italic">aliado na sua gestão.</span>
            </h2>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              O FilaMed foi desenhado para quem precisa de controle. Centralizamos a jornada do paciente para que você possa focar no que importa: a excelência clínica e o crescimento do seu negócio.
            </p>
            <ul className="mt-10 space-y-4">
              {highlights.map((h) => (
                <li key={h} className="flex items-center gap-4 group">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <span className="text-foreground/90 font-medium">{h}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="reveal relative">
            <div className="absolute -inset-10 rounded-full bg-primary/20 blur-[100px] opacity-50" />
            <div className="relative grid grid-cols-2 gap-4">
              {[
                { k: "−68%", v: "Tempo de espera", icon: Zap },
                { k: "+42%", v: "Eficiência Equipe", icon: TrendingUp },
                { k: "2.4x", v: "ROI Estimado", icon: BarChart3 },
                { k: "LGPD", v: "Segurança Total", icon: ShieldCheck },
              ].map((stat) => (
                <div key={stat.v} className="glass rounded-3xl p-8 shadow-soft border border-border/50 hover:border-primary/30 transition-colors group">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div className="font-display text-4xl font-bold text-gradient">{stat.k}</div>
                  <div className="mt-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">{stat.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
