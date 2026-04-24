import { FileBarChart, PieChart, LineChart, LayoutDashboard, Download, CheckCircle2 } from "lucide-react";

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
            <div className="glass rounded-2xl border border-border shadow-2xl overflow-hidden aspect-[4/3] flex flex-col">
              <div className="bg-muted/50 p-3 border-b border-border flex items-center justify-between">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Dashboard Mensal - KPI Overview</div>
                <Download className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 p-6 space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-muted/40 rounded-lg border border-border/50 animate-pulse" />
                  ))}
                </div>
                <div className="h-40 bg-muted/40 rounded-xl border border-border/50 relative overflow-hidden">
                   <div className="absolute inset-0 flex items-center justify-center">
                      <LineChart className="h-12 w-12 text-primary/20" />
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-32 bg-muted/40 rounded-xl border border-border/50 flex items-center justify-center">
                    <PieChart className="h-8 w-8 text-primary/20" />
                  </div>
                  <div className="h-32 bg-muted/40 rounded-xl border border-border/50 flex items-center justify-center">
                    <FileBarChart className="h-8 w-8 text-primary/20" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Annotation */}
            <div className="absolute -bottom-4 -right-4 glass p-4 rounded-xl shadow-lg border border-primary/20 max-w-[200px] z-20">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-xs font-bold uppercase">Insight Automático</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                "O tempo de espera na unidade Centro aumentou 15% após as 14h. Recomendamos reforço na triagem."
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
