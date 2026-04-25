import { CheckCircle2, TrendingDown, TrendingUp, Calculator, ArrowRight, Quote, Star } from "lucide-react";

export function SocialProof() {
  return (
    <section id="prova-social" className="py-24 bg-background overflow-hidden">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div className="reveal">
            <h2 className="text-3xl font-bold sm:text-4xl mb-6 font-display">
              Resultados Reais de <span className="text-primary">Quem Já Usa.</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-12">
              Não é apenas sobre software, é sobre eficiência operacional que se traduz em faturamento.
            </p>

            <div className="space-y-8">
              <div className="relative p-8 rounded-3xl bg-muted/30 border border-border">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-sm font-bold text-muted-foreground uppercase mb-2">Antes do FilaMed</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-destructive">
                        <TrendingDown className="h-4 w-4" />
                        <span className="text-sm font-medium">45 min espera média</span>
                      </div>
                      <div className="flex items-center gap-2 text-destructive">
                        <TrendingDown className="h-4 w-4" />
                        <span className="text-sm font-medium">15% desistência</span>
                      </div>
                    </div>
                  </div>
                  <div className="border-l border-border pl-8">
                    <p className="text-sm font-bold text-primary uppercase mb-2">Com FilaMed</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-success">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-sm font-bold">12 min espera média</span>
                      </div>
                      <div className="flex items-center gap-2 text-success">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-sm font-bold">2% desistência</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-border/50">
                  <p className="text-sm italic text-muted-foreground">
                    "Em apenas 3 meses, reduzimos drasticamente as reclamações e aumentamos o volume de atendimentos particulares em 20%."
                  </p>
                  <p className="mt-2 text-xs font-bold">— Diretor Operacional, Hospital São Luiz</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Unidades", val: "150+" },
                  { label: "Pacientes/mês", val: "1M+" },
                  { label: "Redução de Custo", val: "22%" }
                ].map((stat, i) => (
                  <div key={i} className="text-center p-4 rounded-2xl bg-primary/5 border border-primary/10">
                    <div className="text-2xl font-bold text-primary">{stat.val}</div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="p-8 rounded-3xl bg-card border border-border shadow-sm">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm italic text-muted-foreground leading-relaxed mb-4">
                  "O FilaMed mudou completamente a nossa percepção sobre o tempo do paciente. O dashboard nos permite agir preventivamente antes que a recepção lote, otimizando o custo operacional por atendimento."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                    MS
                  </div>
                  <div>
                    <p className="text-xs font-bold">Mariana Silva</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Gestora de OP · Clínica Viver</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="reveal">
            <div className="glass p-8 rounded-3xl border border-primary/20 shadow-xl relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Calculator className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold">Estimativa de ROI</h3>
              </div>

              <p className="text-sm text-muted-foreground mb-8">
                Calcule quanto sua clínica está deixando de faturar devido à ineficiência das filas atuais.
              </p>

              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold uppercase text-muted-foreground mb-2 block">Volume Mensal de Pacientes</label>
                  <div className="h-1.5 w-full bg-muted rounded-full relative">
                    <div className="absolute top-1/2 -translate-y-1/2 left-[40%] w-4 h-4 bg-primary rounded-full shadow-lg border-2 border-background cursor-pointer" />
                    <div className="h-full bg-primary rounded-full w-[40%]" />
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] font-bold">
                    <span>1.000</span>
                    <span className="text-primary font-bold">5.000</span>
                    <span>10.000+</span>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-primary/10 border border-primary/20 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Economia Estimada (Equipe)</span>
                    <span className="font-bold text-success">R$ 4.200/mês</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Recuperação de Abandono</span>
                    <span className="font-bold text-success">R$ 12.500/mês</span>
                  </div>
                  <div className="pt-4 border-t border-primary/20 flex justify-between items-center">
                    <span className="font-bold text-lg">Impacto Total</span>
                    <span className="text-2xl font-black text-primary">R$ 16.700/mês</span>
                  </div>
                </div>

                <button className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                  Receber Diagnóstico Completo
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
