import { useState, useMemo } from "react";
import { Calculator, TrendingUp, Wallet, ArrowRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { WhatsAppFlow } from "@/components/whatsapp-flow";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function ROICalculator() {
  const [atendimentosDia, setAtendimentosDia] = useState(50);
  const [tempoEspera, setTempoEspera] = useState(45);
  const [capacidade, setCapacidade] = useState(5);

  const results = useMemo(() => {
    // Premissas conservadoras
    const ticketMedio = 180;
    const diasMes = 22;
    const custoMedioProfissional = 4500;
    
    // Impacto do FilaMed:
    // 1. Redução de inoperância/ociosidade da equipe em 15%
    // 2. Aumento de throughput (vazão) em 10% por redução de gargalos
    // 3. Redução de churn (pacientes que desistem) em 5% se espera > 30min
    
    const reducaoInoperancia = 0.15;
    const aumentoThroughput = 0.10;
    const reducaoChurn = tempoEspera > 30 ? 0.05 : 0.02;

    const receitaMensalAtual = atendimentosDia * ticketMedio * diasMes;
    const receitaExtraMensal = receitaMensalAtual * (aumentoThroughput + reducaoChurn);
    const economiaOperacionalMensal = capacidade * custoMedioProfissional * reducaoInoperancia;

    const economiaAnual = (receitaExtraMensal + economiaOperacionalMensal) * 12;
    const receitaAnualExtra = receitaExtraMensal * 12;

    return {
      economiaAnual: {
        min: economiaAnual * 0.85,
        max: economiaAnual * 1.15
      },
      receitaAnual: {
        min: receitaAnualExtra * 0.85,
        max: receitaAnualExtra * 1.15
      }
    };
  }, [atendimentosDia, tempoEspera, capacidade]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <section id="calculadora-roi" className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-primary/5 -skew-y-3 origin-right pointer-events-none" />
      
      <div className="mx-auto max-w-7xl px-6 relative">
        <div className="mx-auto max-w-3xl text-center reveal mb-16">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Calculadora de Impacto</span>
          <h2 className="mt-4 text-3xl font-bold sm:text-5xl font-display">
            Quanto sua clínica <span className="text-gradient">está deixando na mesa?</span>
          </h2>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Simule o retorno sobre o investimento ao implementar o FilaMed na sua operação.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-12 items-start">
          {/* Inputs */}
          <div className="lg:col-span-5 space-y-8 reveal">
            <div className="space-y-6 bg-card border border-border p-8 rounded-3xl shadow-sm">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-semibold">Atendimentos por dia</Label>
                  <span className="text-primary font-bold">{atendimentosDia}</span>
                </div>
                <Slider
                  value={[atendimentosDia]}
                  onValueChange={(v) => setAtendimentosDia(v[0])}
                  max={500}
                  step={5}
                  className="py-4"
                />
                <p className="text-xs text-muted-foreground italic">Média de pacientes recebidos diariamente na unidade.</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-semibold">Tempo médio de espera (min)</Label>
                  <span className="text-primary font-bold">{tempoEspera} min</span>
                </div>
                <Slider
                  value={[tempoEspera]}
                  onValueChange={(v) => setTempoEspera(v[0])}
                  max={180}
                  step={5}
                  className="py-4"
                />
                <p className="text-xs text-muted-foreground italic">Desde a chegada até o início do atendimento médico/exame.</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-semibold">Capacidade da equipe</Label>
                  <span className="text-primary font-bold">{capacidade} profissionais</span>
                </div>
                <Slider
                  value={[capacidade]}
                  onValueChange={(v) => setCapacidade(v[0])}
                  max={50}
                  step={1}
                  className="py-4"
                />
                <p className="text-xs text-muted-foreground italic">Número de consultórios, guichês ou profissionais simultâneos.</p>
              </div>
            </div>

            <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10 flex gap-4">
              <Info className="h-6 w-6 text-primary shrink-0" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Os cálculos baseiam-se em dados médios de mercado para redução de ociosidade (15%) e aumento de vazão operacional (10%) observados em nossos clientes.
              </p>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-7 reveal">
            <div className="grid gap-6 sm:grid-cols-2 h-full">
              <Card className="p-8 border-2 border-primary/20 bg-gradient-to-br from-card to-primary/5 relative overflow-hidden group hover:border-primary/40 transition-all flex flex-col justify-between">
                <div className="relative">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-muted-foreground mb-1">Receita Adicional Estimada</h3>
                  <p className="text-xs text-muted-foreground mb-6">Anual</p>
                  
                  <div className="space-y-1">
                    <p className="text-3xl sm:text-4xl font-bold font-display text-primary">
                      {formatCurrency(results.receitaAnual.min)}
                    </p>
                    <p className="text-sm text-muted-foreground">até {formatCurrency(results.receitaAnual.max)}</p>
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-border/50">
                  <p className="text-xs text-muted-foreground">Potencial ganho com redução de desistências e otimização de agenda.</p>
                </div>
              </Card>

              <Card className="p-8 border-2 border-success/20 bg-gradient-to-br from-card to-success/5 relative overflow-hidden group hover:border-success/40 transition-all flex flex-col justify-between">
                <div className="relative">
                  <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center mb-6 text-success group-hover:scale-110 transition-transform">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-muted-foreground mb-1">Economia e Eficiência</h3>
                  <p className="text-xs text-muted-foreground mb-6">Anual</p>
                  
                  <div className="space-y-1">
                    <p className="text-3xl sm:text-4xl font-bold font-display text-success">
                      {formatCurrency(results.economiaAnual.min)}
                    </p>
                    <p className="text-sm text-muted-foreground">até {formatCurrency(results.economiaAnual.max)}</p>
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-border/50">
                  <p className="text-xs text-muted-foreground">Redução de custos com ociosidade de equipe e gargalos operacionais.</p>
                </div>
              </Card>

              <div className="sm:col-span-2 bg-foreground text-background rounded-3xl p-8 flex flex-col sm:flex-row items-center justify-between gap-8 mt-4">
                <div className="space-y-2 text-center sm:text-left">
                  <h4 className="text-2xl font-bold font-display">Pronto para transformar esses números em realidade?</h4>
                  <p className="text-background/70">Fale com um especialista e receba um diagnóstico detalhado da sua clínica.</p>
                </div>
                <WhatsAppFlow />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
