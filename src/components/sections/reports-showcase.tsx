import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Download,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Users,
  Clock,
  ArrowUpRight,
  BarChart3,
  Loader2,
  Database,
  Sparkles,
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type DashboardState = "loading" | "empty" | "loaded";

/** Barra de skeleton com shimmer — usa o keyframe global "shimmer" definido em styles.css */
function SkeletonBar({
  w = "100%",
  h = "0.75rem",
  rounded = "rounded-full",
}: {
  w?: string;
  h?: string;
  rounded?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden bg-muted/50 ${rounded}`}
      style={{ width: w, height: h }}
    >
      <div
        className="absolute inset-0 animate-[shimmer_2s_linear_infinite] bg-gradient-to-r from-transparent via-primary/15 to-transparent"
        style={{ backgroundSize: "200% 100%" }}
      />
    </div>
  );
}

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

  // Auto-rotaciona entre os estados pra dar sensação de produto vivo:
  // loaded (5s) → loading (1.6s) → empty (3.5s) → loaded ...
  const [state, setState] = useState<DashboardState>("loaded");
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const cycle: { s: DashboardState; ms: number }[] = [
      { s: "loaded", ms: 5000 },
      { s: "loading", ms: 1600 },
      { s: "empty", ms: 3500 },
    ];
    const idx = cycle.findIndex((c) => c.s === state);
    const current = cycle[idx === -1 ? 0 : idx];
    const next = cycle[(idx + 1) % cycle.length];
    const t = setTimeout(() => setState(next.s), current.ms);
    return () => clearTimeout(t);
  }, [state, paused]);

  return (
    <TooltipProvider delayDuration={150}>
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
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <div className="p-4 rounded-xl border border-border bg-background shadow-sm hover:shadow-md hover:border-primary/40 transition-all cursor-help">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-foreground flex items-center gap-1.5">
                          {kpi.title}
                          <Info className="h-3 w-3 text-muted-foreground/60" />
                        </h4>
                        <span className="text-xs font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">{kpi.value}</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{kpi.desc}</p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p className="font-bold mb-1">Como medimos</p>
                    <p className="text-xs leading-relaxed">{kpi.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          <div
            className="relative reveal pt-6 pb-20 sm:pb-6 px-2 sm:px-0"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {/* State switcher tabs (acima do mock) */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 rounded-full border border-border bg-background/95 p-1 shadow-lg backdrop-blur">
              {([
                { k: "loaded" as DashboardState, label: "Com dados", icon: BarChart3 },
                { k: "loading" as DashboardState, label: "Carregando", icon: Loader2 },
                { k: "empty" as DashboardState, label: "Sem dados", icon: Database },
              ]).map(({ k, label, icon: Icon }) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setState(k)}
                  className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${
                    state === k
                      ? "bg-gradient-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                  aria-pressed={state === k}
                >
                  <Icon className={`h-3 w-3 ${k === "loading" && state === k ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            <div className="glass rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col bg-background transition-all duration-500 hover:shadow-elegant hover:-translate-y-1">
              {/* Title bar */}
              <div className="bg-muted/40 px-3 sm:px-4 py-2 sm:py-2.5 border-b border-border flex items-center justify-between gap-2">
                <div className="flex gap-1.5 flex-shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">
                  <span className="hidden sm:inline">Dashboard Mensal · KPI Overview</span>
                  <span className="sm:hidden">KPI Overview</span>
                </div>
                <Download className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              </div>

              <div key={state} className="flex-1 p-3 sm:p-5 space-y-3 sm:space-y-5 min-h-[360px] sm:min-h-[420px]">
                {state === "loading" && (
                  <>
                    {/* Skeleton: KPI row */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className={`rounded-lg border border-border/60 bg-muted/20 p-2.5 sm:p-3 ${
                            i === 2 ? "col-span-2 sm:col-span-1" : ""
                          }`}
                        >
                          <SkeletonBar w="40%" h="0.5rem" />
                          <div className="mt-2 flex items-end justify-between gap-1">
                            <SkeletonBar w="55%" h="1rem" />
                            <SkeletonBar w="25%" h="0.5rem" />
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Skeleton: chart */}
                    <div className="rounded-xl border border-border/60 bg-muted/10 p-3 sm:p-4">
                      <div className="flex items-center justify-between mb-3">
                        <SkeletonBar w="35%" h="0.6rem" />
                        <SkeletonBar w="25%" h="0.5rem" />
                      </div>
                      <div className="relative h-20 sm:h-24 overflow-hidden rounded-md">
                        <SkeletonBar w="100%" h="100%" rounded="rounded-md" />
                      </div>
                    </div>
                    {/* Skeleton: bottom row */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <div className="rounded-xl border border-border/60 bg-muted/10 p-2.5 sm:p-3 space-y-2">
                        <SkeletonBar w="40%" h="0.5rem" />
                        <div className="flex items-end gap-1.5 h-12 sm:h-16">
                          {[55, 78, 42, 88, 65, 72, 60].map((h, i) => (
                            <div key={i} className="flex-1 flex flex-col justify-end">
                              <SkeletonBar w="100%" h={`${h}%`} rounded="rounded-t-sm" />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-muted/10 p-2.5 sm:p-3 space-y-2">
                        <SkeletonBar w="50%" h="0.5rem" />
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full border-[5px] border-muted/40 relative overflow-hidden">
                            <div className="absolute inset-0 animate-[shimmer_2s_linear_infinite] bg-gradient-to-r from-transparent via-primary/15 to-transparent" style={{ backgroundSize: "200% 100%" }} />
                          </div>
                          <div className="flex-1 space-y-1.5">
                            <SkeletonBar w="80%" h="0.5rem" />
                            <SkeletonBar w="60%" h="0.5rem" />
                            <SkeletonBar w="70%" h="0.5rem" />
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Loading badge */}
                    <div className="flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground pt-1">
                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                      Sincronizando dados em tempo real…
                    </div>
                  </>
                )}

                {state === "empty" && (
                  <div className="flex flex-1 min-h-[300px] sm:min-h-[360px] flex-col items-center justify-center text-center px-4 py-6 animate-[fade-in_0.5s_ease-out]">
                    <div className="relative mb-4">
                      <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-2xl animate-pulse-glow" />
                      <div className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
                        <Database className="h-7 w-7 sm:h-8 sm:w-8 text-primary-foreground" />
                      </div>
                    </div>
                    <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-primary mb-2">
                      Sem dados ainda
                    </p>
                    <h4 className="font-display text-base sm:text-lg font-bold text-foreground mb-2 max-w-xs">
                      Aguardando o primeiro atendimento desta unidade
                    </h4>
                    <p className="text-xs text-muted-foreground max-w-xs leading-relaxed mb-4">
                      Assim que sua equipe começar a chamar senhas, os indicadores aparecem aqui em tempo real.
                    </p>
                    <button
                      type="button"
                      onClick={() => setState("loading")}
                      className="inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-primary-foreground shadow-soft transition-all hover:shadow-glow hover:-translate-y-0.5"
                    >
                      <Sparkles className="h-3 w-3" />
                      Gerar dados de exemplo
                    </button>
                    {/* Skeleton mini-rows decorativos */}
                    <div className="mt-6 w-full max-w-xs space-y-2 opacity-40">
                      {[60, 80, 45].map((w, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                          <div className="h-1.5 rounded-full bg-muted-foreground/20" style={{ width: `${w}%` }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {state === "loaded" && (
                  <>
                    {/* KPI cards: 2 cols on mobile (3rd full-width), 3 on sm+ */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                      {[
                        { icon: Clock, label: "TME", value: "14min", delta: "-22%", down: true },
                        { icon: Users, label: "Atendidos", value: "1.284", delta: "+8%", down: false },
                        { icon: TrendingUp, label: "Throughput", value: "92%", delta: "+15%", down: false },
                      ].map((k, i) => (
                        <div
                          key={i}
                          className={`group rounded-lg border border-border/60 bg-muted/20 p-2.5 sm:p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/40 hover:shadow-md cursor-default animate-[fade-up_0.6s_cubic-bezier(0.16,1,0.3,1)_both] ${
                            i === 2 ? "col-span-2 sm:col-span-1" : ""
                          }`}
                          style={{ animationDelay: `${i * 100}ms` }}
                        >
                          <div className="flex items-center gap-1.5 text-muted-foreground transition-colors group-hover:text-primary">
                            <k.icon className="h-3 w-3 transition-transform group-hover:scale-110" />
                            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">{k.label}</span>
                          </div>
                          <div className="mt-1.5 flex items-end justify-between gap-1">
                            <span className="text-base sm:text-lg font-bold text-foreground leading-none transition-colors group-hover:text-primary">{k.value}</span>
                            <span className="flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold text-success">
                              {k.down ? <TrendingDown className="h-2.5 w-2.5" /> : <ArrowUpRight className="h-2.5 w-2.5" />}
                              {k.delta}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Line chart */}
                    <div className="rounded-xl border border-border/60 bg-muted/10 p-3 sm:p-4 transition-all duration-300 hover:border-primary/30 hover:bg-muted/20">
                      <div className="flex items-start sm:items-center justify-between mb-2 sm:mb-3 gap-2 flex-wrap">
                        <div>
                          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Senhas / dia</p>
                          <p className="text-xs sm:text-sm font-bold text-foreground">Últimos 14 dias</p>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 text-[9px] font-semibold">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <span className="w-2 h-2 rounded-full bg-primary" /> Atendidas
                          </span>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <span className="w-2 h-2 rounded-full bg-primary/30" /> Abandonos
                          </span>
                        </div>
                      </div>
                      <svg viewBox="0 0 280 90" className="w-full h-20 sm:h-24" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {[0, 30, 60, 90].map((y) => (
                          <line key={y} x1="0" x2="280" y1={y} y2={y} stroke="currentColor" className="text-border" strokeWidth="0.5" strokeDasharray="2 3" />
                        ))}
                        <path
                          d="M0,60 L20,52 L40,55 L60,40 L80,45 L100,30 L120,35 L140,22 L160,28 L180,18 L200,24 L220,15 L240,20 L260,10 L280,14 L280,90 L0,90 Z"
                          fill="url(#areaGrad)"
                          style={{ animation: "fade-in 1.4s ease-out 0.6s both" }}
                        />
                        <path
                          d="M0,60 L20,52 L40,55 L60,40 L80,45 L100,30 L120,35 L140,22 L160,28 L180,18 L200,24 L220,15 L240,20 L260,10 L280,14"
                          fill="none"
                          stroke="hsl(var(--primary))"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeDasharray="600"
                          style={{ animation: "draw-line 1.6s cubic-bezier(0.65, 0, 0.35, 1) 0.2s both", ["--dash-len" as string]: "600" }}
                        />
                        <path
                          d="M0,75 L20,72 L40,74 L60,68 L80,70 L100,65 L120,67 L140,62 L160,64 L180,60 L200,62 L220,58 L240,60 L260,56 L280,58"
                          fill="none"
                          stroke="hsl(var(--primary))"
                          strokeOpacity="0.35"
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                          style={{ animation: "fade-in 1.2s ease-out 1s both" }}
                        />
                        <circle
                          cx="260" cy="10" r="6"
                          fill="hsl(var(--primary))"
                          style={{ transformOrigin: "260px 10px", animation: "live-pulse 2s ease-out 1.6s infinite" }}
                        />
                        <circle
                          cx="260" cy="10" r="3"
                          fill="hsl(var(--primary))"
                          style={{ animation: "scale-in 0.4s ease-out 1.6s both", transformOrigin: "260px 10px" }}
                        />
                      </svg>
                    </div>

                    {/* Bottom: bars + donut */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <div className="group rounded-xl border border-border/60 bg-muted/10 p-2.5 sm:p-3 transition-all duration-300 hover:border-primary/30 hover:bg-muted/20 hover:shadow-sm">
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Ocupação</p>
                        <div className="flex items-end gap-1 sm:gap-1.5 h-12 sm:h-16">
                          {[55, 78, 42, 88, 65, 72, 60].map((h, i) => (
                            <div key={i} className="flex-1 flex flex-col justify-end">
                              <div
                                className="w-full rounded-t-sm bg-gradient-to-t from-primary to-primary-glow transition-transform duration-300 group-hover:brightness-110"
                                style={{
                                  height: `${h}%`,
                                  transformOrigin: "bottom",
                                  animation: `bar-grow 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${0.4 + i * 70}ms both`,
                                }}
                              />
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between mt-1.5 text-[7px] sm:text-[8px] text-muted-foreground font-semibold">
                          <span>C1</span><span>C2</span><span>C3</span><span>C4</span><span>C5</span><span>C6</span><span>C7</span>
                        </div>
                      </div>

                      <div className="group rounded-xl border border-border/60 bg-muted/10 p-2.5 sm:p-3 transition-all duration-300 hover:border-primary/30 hover:bg-muted/20 hover:shadow-sm">
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Especialidades</p>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <svg viewBox="0 0 36 36" className="h-12 w-12 sm:h-16 sm:w-16 -rotate-90 flex-shrink-0 transition-transform duration-500 group-hover:rotate-[-80deg]">
                            <circle cx="18" cy="18" r="14" fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
                            <circle cx="18" cy="18" r="14" fill="none" stroke="hsl(var(--primary))" strokeWidth="5"
                              strokeDasharray="44 88" strokeLinecap="round"
                              style={{ strokeDashoffset: 44, animation: "donut-in 0.9s cubic-bezier(0.16,1,0.3,1) 0.5s both", ["--seg-len" as string]: "44", ["--seg-final" as string]: "0" }} />
                            <circle cx="18" cy="18" r="14" fill="none" stroke="hsl(var(--primary))" strokeOpacity="0.55" strokeWidth="5"
                              strokeDasharray="26 88" strokeDashoffset="-44" strokeLinecap="round"
                              style={{ animation: "fade-in 0.6s ease-out 1.1s both" }} />
                            <circle cx="18" cy="18" r="14" fill="none" stroke="hsl(var(--primary))" strokeOpacity="0.25" strokeWidth="5"
                              strokeDasharray="18 88" strokeDashoffset="-70" strokeLinecap="round"
                              style={{ animation: "fade-in 0.6s ease-out 1.4s both" }} />
                          </svg>
                          <div className="flex-1 space-y-1 min-w-0">
                            {[
                              { l: "Clínica", v: "50%", c: "bg-primary" },
                              { l: "Pediatria", v: "30%", c: "bg-primary/55" },
                              { l: "Gineco", v: "20%", c: "bg-primary/25" },
                            ].map((s, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between gap-1 text-[9px] sm:text-[10px]"
                                style={{ animation: `fade-up 0.5s cubic-bezier(0.16,1,0.3,1) ${0.7 + i * 100}ms both` }}
                              >
                                <span className="flex items-center gap-1 text-muted-foreground truncate">
                                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.c}`} /> <span className="truncate">{s.l}</span>
                                </span>
                                <span className="font-bold text-foreground flex-shrink-0">{s.v}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Floating insight annotation — só aparece com dados carregados */}
            {state === "loaded" && (
              <div className="mt-3 lg:mt-0 lg:absolute lg:-bottom-4 lg:-right-4 glass p-3 sm:p-4 rounded-xl shadow-xl border border-primary/20 lg:max-w-[220px] z-20 bg-background/95 backdrop-blur animate-[fade-up_0.6s_cubic-bezier(0.16,1,0.3,1)_both]">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wide">Insight Automático</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  "O tempo de espera na unidade Centro aumentou 15% após as 14h. Recomendamos reforço na triagem."
                </p>
              </div>
            )}

            {/* Floating top-left badge — só com dados, oculto em mobile */}
            {state === "loaded" && (
              <div className="hidden sm:flex absolute -top-4 -left-4 glass p-3 rounded-xl shadow-lg border border-border z-20 bg-background/95 backdrop-blur animate-float">
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
            )}
          </div>
        </div>
      </div>
    </section>
    </TooltipProvider>
  );
}
