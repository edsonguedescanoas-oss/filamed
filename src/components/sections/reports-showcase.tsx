import { LayoutDashboard, Download, CheckCircle2, TrendingDown, TrendingUp, Users, Clock, ArrowUpRight } from "lucide-react";

export function ReportsShowcase() {
  const kpis = [
    {
      title: "Tempo Médio de Espera (TME)",
      desc: "O KPI mais crítico. Reduzir o TME aumenta a conversão de pacientes particulares e a satisfação geral.",
      value: "Redução de 35%",
      impact: "Alta"
    },
    {
      title: "Taxa de Abandono",
      desc: "Mede quantos pacientes desistem antes de serem chamados. Crucial para identificar gargalos na recepção.",
      value: "Queda de 12%",
      impact: "Média"
    },
    {
      title: "Throughput por Médico",
      desc: "Volume de atendimentos concluídos. Ajuda a balancear a carga de trabalho e identificar alta performance.",
      value: "+15% Capacidade",
      impact: "Alta"
    }
  ];

  return (
    <section id="reports-showcase" className="py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center max-w-3xl mx-auto mb-16 reveal">
          <h2 className="text-3xl font-bold sm:text-4xl mb-4 font-display">
            Relatórios que <span className="text-primary italic">fecham o mês</span> no azul.
          </h2>
          <p className="text-lg text-muted-foreground">
            Transformamos dados brutos em inteligência estratégica para diretores e gestores de unidades de saúde.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
          <div className="reveal">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <LayoutDashboard className="text-primary h-6 w-6" />
              Visão Executiva Consolidada
            </h3>
            <p className="text-muted-foreground mb-8">
              Acompanhe todas as suas unidades em uma única tela. Filtre por período, especialidade ou convênio e identifique tendências antes que se tornem problemas.
            </p>
            
            <div className="space-y-4">
              {kpis.map((kpi, i) => (
                <div key={i} className="p-4 rounded-xl border border-border bg-background shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-foreground">{kpi.title}</h4>
                    <span className="text-xs font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">{kpi.value}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{kpi.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative reveal">
            <div className="glass rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col bg-background">
              {/* Title bar */}
              <div className="bg-muted/40 px-4 py-2.5 border-b border-border flex items-center justify-between">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Dashboard Mensal · KPI Overview
                </div>
                <Download className="h-3.5 w-3.5 text-muted-foreground" />
              </div>

              <div className="flex-1 p-5 space-y-5">
                {/* KPI cards */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: Clock, label: "TME", value: "14min", delta: "-22%", down: true },
                    { icon: Users, label: "Atendidos", value: "1.284", delta: "+8%", down: false },
                    { icon: TrendingUp, label: "Throughput", value: "92%", delta: "+15%", down: false },
                  ].map((k, i) => (
                    <div key={i} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <k.icon className="h-3 w-3" />
                        <span className="text-[9px] font-bold uppercase tracking-wider">{k.label}</span>
                      </div>
                      <div className="mt-1.5 flex items-end justify-between gap-1">
                        <span className="text-lg font-bold text-foreground leading-none">{k.value}</span>
                        <span className={`flex items-center gap-0.5 text-[9px] font-bold ${k.down ? "text-success" : "text-success"}`}>
                          {k.down ? <TrendingDown className="h-2.5 w-2.5" /> : <ArrowUpRight className="h-2.5 w-2.5" />}
                          {k.delta}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Line chart */}
                <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Senhas / dia</p>
                      <p className="text-sm font-bold text-foreground">Últimos 14 dias</p>
                    </div>
                    <div className="flex items-center gap-3 text-[9px] font-semibold">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <span className="w-2 h-2 rounded-full bg-primary" /> Atendidas
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <span className="w-2 h-2 rounded-full bg-primary/30" /> Abandonos
                      </span>
                    </div>
                  </div>
                  <svg viewBox="0 0 280 90" className="w-full h-24" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {/* gridlines */}
                    {[0, 30, 60, 90].map((y) => (
                      <line key={y} x1="0" x2="280" y1={y} y2={y} stroke="currentColor" className="text-border" strokeWidth="0.5" strokeDasharray="2 3" />
                    ))}
                    {/* main area */}
                    <path
                      d="M0,60 L20,52 L40,55 L60,40 L80,45 L100,30 L120,35 L140,22 L160,28 L180,18 L200,24 L220,15 L240,20 L260,10 L280,14 L280,90 L0,90 Z"
                      fill="url(#areaGrad)"
                    />
                    <path
                      d="M0,60 L20,52 L40,55 L60,40 L80,45 L100,30 L120,35 L140,22 L160,28 L180,18 L200,24 L220,15 L240,20 L260,10 L280,14"
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* secondary line */}
                    <path
                      d="M0,75 L20,72 L40,74 L60,68 L80,70 L100,65 L120,67 L140,62 L160,64 L180,60 L200,62 L220,58 L240,60 L260,56 L280,58"
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeOpacity="0.35"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                    {/* highlight dot */}
                    <circle cx="260" cy="10" r="3" fill="hsl(var(--primary))" />
                    <circle cx="260" cy="10" r="6" fill="hsl(var(--primary))" fillOpacity="0.2" />
                  </svg>
                </div>

                {/* Bottom: bars + donut */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Bars: ocupação por consultório */}
                  <div className="rounded-xl border border-border/60 bg-muted/10 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Ocupação</p>
                    <div className="flex items-end gap-1.5 h-16">
                      {[55, 78, 42, 88, 65, 72, 60].map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col justify-end">
                          <div
                            className="w-full rounded-t-sm bg-gradient-to-t from-primary to-primary-glow"
                            style={{ height: `${h}%` }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-1.5 text-[8px] text-muted-foreground font-semibold">
                      <span>C1</span><span>C2</span><span>C3</span><span>C4</span><span>C5</span><span>C6</span><span>C7</span>
                    </div>
                  </div>

                  {/* Donut: especialidades */}
                  <div className="rounded-xl border border-border/60 bg-muted/10 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Especialidades</p>
                    <div className="flex items-center gap-3">
                      <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                        <circle cx="18" cy="18" r="14" fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
                        <circle cx="18" cy="18" r="14" fill="none" stroke="hsl(var(--primary))" strokeWidth="5"
                          strokeDasharray="44 88" strokeLinecap="round" />
                        <circle cx="18" cy="18" r="14" fill="none" stroke="hsl(var(--primary))" strokeOpacity="0.55" strokeWidth="5"
                          strokeDasharray="26 88" strokeDashoffset="-44" strokeLinecap="round" />
                        <circle cx="18" cy="18" r="14" fill="none" stroke="hsl(var(--primary))" strokeOpacity="0.25" strokeWidth="5"
                          strokeDasharray="18 88" strokeDashoffset="-70" strokeLinecap="round" />
                      </svg>
                      <div className="flex-1 space-y-1">
                        {[
                          { l: "Clínica", v: "50%", c: "bg-primary" },
                          { l: "Pediatria", v: "30%", c: "bg-primary/55" },
                          { l: "Gineco", v: "20%", c: "bg-primary/25" },
                        ].map((s, i) => (
                          <div key={i} className="flex items-center justify-between text-[9px]">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <span className={`w-1.5 h-1.5 rounded-full ${s.c}`} /> {s.l}
                            </span>
                            <span className="font-bold text-foreground">{s.v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating insight annotation */}
            <div className="absolute -bottom-4 -right-4 glass p-4 rounded-xl shadow-xl border border-primary/20 max-w-[220px] z-20 bg-background/95 backdrop-blur">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-xs font-bold uppercase tracking-wide">Insight Automático</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                "O tempo de espera na unidade Centro aumentou 15% após as 14h. Recomendamos reforço na triagem."
              </p>
            </div>

            {/* Floating top-left badge */}
            <div className="absolute -top-4 -left-4 glass p-3 rounded-xl shadow-lg border border-border z-20 bg-background/95 backdrop-blur animate-float">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-success/15 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold leading-none">Eficiência</p>
                  <p className="text-sm font-bold text-foreground">+18,4%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
