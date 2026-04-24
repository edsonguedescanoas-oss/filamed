import { BarChart3, TrendingUp, Users, Clock, ArrowUpRight, PieChart, Activity } from "lucide-react";

export function AnalyticsShowcase() {
  return (
    <section id="analytics" className="relative py-24 sm:py-32 overflow-hidden bg-background">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-7xl pointer-events-none opacity-20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary-glow/30 rounded-full blur-[120px]" />
      </div>

      <div className="mx-auto max-w-7xl px-6 relative">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="reveal">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary mb-6">
              <Activity className="h-3 w-3" />
              Gestão Baseada em Dados
            </span>
            <h2 className="text-3xl font-bold sm:text-5xl leading-tight font-display">
              O que você não mede, <br />
              <span className="text-gradient font-bold italic">você não gerencia.</span>
            </h2>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              Esqueça o "eu acho". Tenha números reais sobre a performance da sua clínica. Saiba exatamente onde estão os gargalos e tome decisões que aumentam o lucro e a satisfação.
            </p>
            
            <div className="mt-10 space-y-6">
              {[
                {
                  title: "Performance por Unidade e Médico",
                  desc: "Identifique quem são seus talentos e quem precisa de treinamento com dados individuais de throughput.",
                  icon: Users
                },
                {
                  title: "Previsibilidade de Demanda",
                  desc: "Saiba quais dias e horários sua clínica lota e ajuste sua escala de funcionários preventivamente.",
                  icon: TrendingUp
                },
                {
                  title: "Relatórios de ROI Operacional",
                  desc: "Visualize a economia gerada pela redução do tempo de espera e otimização do fluxo.",
                  icon: PieChart
                }
              ].map((item, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center group-hover:border-primary/50 transition-colors shadow-sm">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">{item.title}</h3>
                    <p className="text-muted-foreground text-sm mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative reveal">
            <div className="glass rounded-3xl p-8 border border-border shadow-2xl relative z-10 overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h4 className="font-bold text-xl">Dashboard Executivo</h4>
                  <p className="text-sm text-muted-foreground">Consolidado Mensal · Todas as Unidades</p>
                </div>
                <div className="bg-success/10 text-success px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3" />
                  +12% Eficiência
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-muted/30 rounded-2xl p-4 border border-border/50">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Tempo Médio Espera</p>
                  <div className="flex items-end gap-2 mt-1">
                    <span className="text-2xl font-bold text-primary">14 min</span>
                    <span className="text-[10px] text-success font-bold pb-1">-22% vs mes ant.</span>
                  </div>
                </div>
                <div className="bg-muted/30 rounded-2xl p-4 border border-border/50">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Pacientes Atendidos</p>
                  <div className="flex items-end gap-2 mt-1">
                    <span className="text-2xl font-bold text-primary">1.284</span>
                    <span className="text-[10px] text-success font-bold pb-1">+8% vs mes ant.</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="h-32 w-full bg-gradient-to-t from-primary/5 to-primary/20 rounded-xl border border-primary/10 relative overflow-hidden">
                  {/* Mock chart representation */}
                  <div className="absolute inset-0 flex items-end justify-around px-4 pb-2">
                    {[40, 60, 45, 80, 55, 90, 70].map((h, i) => (
                      <div key={i} className="w-6 bg-primary rounded-t-sm animate-pulse" style={{ height: `${h}%`, animationDelay: `${i * 100}ms` }} />
                    ))}
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground font-bold px-2">
                  <span>SEG</span><span>TER</span><span>QUA</span><span>QUI</span><span>SEX</span><span>SAB</span><span>DOM</span>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-border">
                <div className="flex items-center justify-between text-sm mb-4 font-semibold">
                  <span>Ocupação por Especialidade</span>
                  <span className="text-primary">Ver Tudo</span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Clínica Médica", val: 85, color: "bg-primary" },
                    { label: "Pediatria", val: 62, color: "bg-primary-glow" },
                    { label: "Ginecologia", val: 44, color: "bg-accent" }
                  ].map((bar, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{bar.label}</span>
                        <span className="font-bold">{bar.val}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${bar.color} rounded-full`} style={{ width: `${bar.val}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating decorative elements */}
            <div className="absolute -top-6 -right-6 glass p-4 rounded-2xl shadow-xl z-20 animate-float">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground leading-none">Meta de Atendimento</p>
                  <p className="text-sm font-bold">Atingida (102%)</p>
                </div>
              </div>
            </div>
            
            <div className="absolute -bottom-6 -left-6 glass p-4 rounded-2xl shadow-xl z-20 animate-float" style={{ animationDelay: "1s" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center text-success">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground leading-none">Crescimento Mensal</p>
                  <p className="text-sm font-bold">+18.4%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
