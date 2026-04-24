import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { FileText, Download, FileSpreadsheet, Share2, Presentation, CheckCircle2, ArrowRight } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/demo")({
  component: DemoPage,
});

function DemoPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="pt-24 pb-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold sm:text-6xl mb-6 font-display leading-tight">
              A Inteligência que <span className="text-gradient">Move sua Gestão.</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Veja como é simples exportar relatórios complexos para apresentações de diretoria e análise de performance.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-4 space-y-6">
              <div className="p-8 rounded-3xl border border-primary/20 bg-primary/5">
                <h3 className="text-xl font-bold mb-6">Opções de Exportação</h3>
                <div className="space-y-4">
                  {[
                    { icon: FileText, label: "PDF Executivo", desc: "Pronto para impressão e reuniões.", format: "PDF" },
                    { icon: FileSpreadsheet, label: "CSV Detalhado", desc: "Para análise em Excel ou BI.", format: "CSV" },
                    { icon: Presentation, label: "PowerPoint (Beta)", desc: "Gráficos prontos para slides.", format: "PPT" },
                    { icon: Share2, label: "Link de Compartilhamento", desc: "Acesso seguro e temporário.", format: "Link" }
                  ].map((opt, i) => (
                    <div 
                      key={i} 
                      className="flex gap-4 group cursor-pointer hover:bg-background/50 p-2 rounded-xl transition-all"
                      onClick={() => trackEvent("download_report", { format: opt.format, type: "sidebar_option" })}
                    >
                      <div className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center text-primary shadow-sm group-hover:border-primary/50">
                        <opt.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-8 rounded-3xl border border-border bg-muted/30">
                <h4 className="font-bold mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  Pronto para a Diretoria
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Nossos relatórios já vêm formatados com os KPIs que os diretores querem ver: Ocupação, Produtividade, ROI e Satisfação do Paciente.
                </p>
                <button className="mt-6 w-full py-3 bg-foreground text-background rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">
                  Baixar Modelo de Relatório
                </button>
              </div>
            </div>

            <div className="lg:col-span-8">
              <div className="glass rounded-3xl border border-border shadow-2xl overflow-hidden">
                <div className="bg-muted/50 p-6 border-b border-border flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold">Relatório de Performance Mensal</h2>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Unidade São Paulo · Março 2024</p>
                  </div>
                  <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background border border-border text-xs font-bold hover:bg-muted transition-colors">
                      <Download className="h-3 w-3" />
                      Exportar PDF
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity">
                      Agendar Envio Semanal
                    </button>
                  </div>
                </div>
                
                <div className="p-8 bg-background min-h-[600px] space-y-8">
                  <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="p-4 rounded-xl border border-border/50 bg-muted/10">
                        <div className="h-2 w-12 bg-muted rounded mb-2" />
                        <div className="h-6 w-20 bg-primary/20 rounded" />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div className="h-8 w-48 bg-muted rounded" />
                    <div className="h-64 w-full bg-muted/20 rounded-2xl border border-border/50 border-dashed flex items-center justify-center">
                       <span className="text-muted-foreground font-medium italic opacity-50">Gráfico de Tendência Operacional</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <div className="h-6 w-32 bg-muted rounded" />
                       <div className="space-y-2">
                         {[1, 2, 3].map(i => (
                           <div key={i} className="h-3 w-full bg-muted/30 rounded" />
                         ))}
                       </div>
                    </div>
                    <div className="space-y-4">
                       <div className="h-6 w-32 bg-muted rounded" />
                       <div className="h-32 w-full bg-muted/20 rounded-xl border border-border/50" />
                    </div>
                  </div>
                  
                  <div className="pt-8 border-t border-border mt-auto">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <Presentation className="h-5 w-5" />
                         </div>
                         <div>
                            <p className="text-sm font-bold">Modo Apresentação</p>
                            <p className="text-xs text-muted-foreground">Clique para projetar os dados em tempo real na sua reunião.</p>
                         </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
