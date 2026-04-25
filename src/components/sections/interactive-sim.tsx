import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Smartphone, 
  Tv, 
  UserCheck, 
  Clock, 
  ArrowRight, 
  BellRing, 
  CheckCircle2,
  ChevronRight,
  Monitor
} from "lucide-react";

const steps = [
  {
    id: "totem",
    title: "1. Paciente Retira a Senha",
    description: "No totem, recepção ou via QR Code. O sistema já classifica a prioridade.",
    icon: UserCheck,
    visual: "totem",
    color: "primary"
  },
  {
    id: "webapp",
    title: "2. Acompanha pelo Celular",
    description: "Sem baixar nada, o paciente vê sua posição e tempo estimado em tempo real.",
    icon: Smartphone,
    visual: "phone",
    color: "amber"
  },
  {
    id: "tv",
    title: "3. Chamada Automática na TV",
    description: "A TV emite sinal sonoro, voz e exibe a senha e o guichê/sala.",
    icon: Tv,
    visual: "tv",
    color: "primary"
  },
  {
    id: "atendimento",
    title: "4. Atendimento Concluído",
    description: "O médico chama com um clique, e o gestor recebe os dados de performance.",
    icon: Monitor,
    visual: "dashboard",
    color: "success"
  }
];

export function InteractiveSim() {
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isPlaying]);

  return (
    <section id="como-funciona" className="py-24 bg-muted/30 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          
          {/* Lado Esquerdo: Conteúdo */}
          <div className="lg:w-1/2 space-y-8">
            <div className="reveal">
              <span className="text-primary font-bold text-sm uppercase tracking-widest">Experiência FilaMed</span>
              <h2 className="text-3xl font-bold sm:text-5xl mt-2 font-display leading-tight">
                Simule a jornada de um <span className="text-gradient">paciente digital.</span>
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Veja como transformamos a espera estressante em um fluxo organizado e transparente.
              </p>
            </div>

            <div className="space-y-4">
              {steps.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => {
                    setActiveStep(index);
                    setIsPlaying(false);
                  }}
                  className={`w-full flex items-start gap-4 p-6 rounded-2xl border transition-all text-left group ${
                    activeStep === index 
                      ? "bg-background border-primary/20 shadow-lg scale-[1.02]" 
                      : "bg-transparent border-transparent hover:bg-background/50 grayscale opacity-60"
                  }`}
                >
                  <div className={`p-3 rounded-xl ${
                    activeStep === index ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    <step.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold ${activeStep === index ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      {step.description}
                    </p>
                    {activeStep === index && (
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 5, ease: "linear" }}
                        className="h-0.5 bg-primary/30 mt-4 rounded-full"
                      />
                    )}
                  </div>
                  <ChevronRight className={`h-5 w-5 mt-1 transition-transform ${activeStep === index ? "text-primary translate-x-1" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>

            <div className="pt-4">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
              >
                {isPlaying ? (
                  <><span className="h-2 w-2 rounded-full bg-primary animate-pulse" /> Pausar Simulação Automática</>
                ) : (
                  <><ArrowRight className="h-3 w-3" /> Retomar Simulação Automática</>
                )}
              </button>
            </div>
          </div>

          {/* Lado Direito: Visual (O "Palco") */}
          <div className="lg:w-1/2 w-full aspect-square max-w-[600px] relative">
            <div className="absolute inset-0 bg-gradient-primary opacity-10 blur-[120px] rounded-full" />
            
            <div className="relative h-full w-full glass rounded-[3rem] border border-border/50 shadow-2xl p-8 flex items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 1.05 }}
                  transition={{ duration: 0.5 }}
                  className="w-full h-full flex items-center justify-center"
                >
                  {/* Cenários de Simulação */}
                  {activeStep === 0 && (
                    <div className="text-center space-y-6">
                      <div className="w-64 h-96 bg-card border-4 border-muted rounded-[2rem] shadow-2xl relative p-4 flex flex-col items-center">
                        <div className="w-12 h-1 bg-muted rounded-full mb-8" />
                        <h4 className="text-sm font-bold text-primary mb-2">Bem-vindo à Clínica</h4>
                        <p className="text-[10px] text-muted-foreground mb-6 text-center">Selecione o serviço para retirar sua senha</p>
                        <div className="space-y-2 w-full">
                          <div className="h-10 w-full bg-primary/10 rounded-xl border border-primary/20 flex items-center px-3 gap-2">
                            <div className="w-3 h-3 rounded-full bg-primary" />
                            <div className="h-2 w-20 bg-primary/20 rounded" />
                          </div>
                          <div className="h-10 w-full bg-muted/50 rounded-xl border border-border flex items-center px-3 gap-2">
                            <div className="w-3 h-3 rounded-full bg-muted" />
                            <div className="h-2 w-24 bg-muted/40 rounded" />
                          </div>
                        </div>
                        <motion.div 
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 1 }}
                          className="mt-12 p-4 bg-background border border-border rounded-xl shadow-lg relative"
                        >
                          <div className="text-[8px] font-bold text-muted-foreground uppercase">Sua Senha</div>
                          <div className="text-3xl font-black text-primary">A-042</div>
                          <div className="text-[8px] text-success font-bold mt-1">EMITIDA COM SUCESSO</div>
                        </motion.div>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-primary">
                        <UserCheck className="h-5 w-5" />
                        <span className="text-sm font-bold uppercase tracking-tighter">Totem de Autoatendimento</span>
                      </div>
                    </div>
                  )}

                  {activeStep === 1 && (
                    <div className="text-center space-y-6">
                      <div className="w-56 h-[420px] bg-slate-900 border-[8px] border-slate-800 rounded-[3rem] shadow-2xl relative p-4 flex flex-col">
                        <div className="w-16 h-1 bg-slate-800 rounded-full mx-auto mb-6" />
                        <div className="flex-1 bg-background rounded-2xl p-4 flex flex-col">
                          <div className="flex justify-between items-center mb-6">
                            <div className="w-8 h-8 rounded-full bg-primary/10" />
                            <div className="text-[10px] font-bold">FilaMed App</div>
                          </div>
                          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 text-center mb-4">
                            <div className="text-[10px] font-medium text-muted-foreground mb-1 uppercase">Sua Posição</div>
                            <div className="text-4xl font-black text-primary">4º</div>
                          </div>
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                                <Clock className="h-4 w-4" />
                              </div>
                              <div className="text-left">
                                <p className="text-[8px] text-muted-foreground font-bold uppercase">Espera Média</p>
                                <p className="text-xs font-bold text-foreground">~12 minutos</p>
                              </div>
                            </div>
                            <div className="p-3 rounded-xl bg-muted/30 border border-border flex items-center gap-2">
                              <BellRing className="h-3 w-3 text-primary animate-bounce" />
                              <p className="text-[10px] font-medium text-muted-foreground">Fique atento à TV</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-amber-600">
                        <Smartphone className="h-5 w-5" />
                        <span className="text-sm font-bold uppercase tracking-tighter">WebApp do Paciente</span>
                      </div>
                    </div>
                  )}

                  {activeStep === 2 && (
                    <div className="text-center space-y-6 w-full px-8">
                      <div className="w-full aspect-video bg-slate-900 border-[12px] border-slate-800 rounded-2xl shadow-2xl relative flex flex-col overflow-hidden">
                        <div className="bg-primary p-4 flex justify-between items-center">
                          <div className="text-white font-black text-2xl tracking-tighter italic">FilaMed</div>
                          <div className="text-primary-foreground/80 text-xs font-bold uppercase">Chamada em tempo real</div>
                        </div>
                        <div className="flex-1 flex">
                          <div className="flex-[0.7] p-8 flex flex-col justify-center items-center border-r border-white/10">
                            <motion.div
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 1, repeat: Infinity }}
                              className="text-white/40 text-sm font-bold uppercase mb-2"
                            >
                              CHAMANDO AGORA
                            </motion.div>
                            <div className="text-8xl font-black text-white tracking-tight">A-042</div>
                            <div className="mt-4 p-2 bg-success rounded-lg text-white font-bold px-6">
                              GUICHÊ 03
                            </div>
                          </div>
                          <div className="flex-[0.3] bg-slate-800/50 p-4 space-y-3">
                             <div className="text-[10px] font-bold text-white/30 uppercase mb-2">ÚLTIMAS CHAMADAS</div>
                             {[1, 2, 3].map(i => (
                               <div key={i} className="flex justify-between items-center bg-slate-900/50 p-2 rounded border border-white/5 opacity-50">
                                 <span className="text-xs font-bold text-white">B-0{15+i}</span>
                                 <span className="text-[8px] font-bold text-primary">SL 0{i}</span>
                               </div>
                             ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-primary">
                        <Tv className="h-5 w-5" />
                        <span className="text-sm font-bold uppercase tracking-tighter">Painel de TV (Call Panel)</span>
                      </div>
                    </div>
                  )}

                  {activeStep === 3 && (
                    <div className="text-center space-y-6 w-full px-8">
                      <div className="w-full aspect-video bg-background border border-border rounded-xl shadow-2xl relative flex flex-col overflow-hidden">
                        <div className="h-8 bg-muted flex items-center px-4 gap-2 border-b border-border">
                          <div className="w-2 h-2 rounded-full bg-red-400" />
                          <div className="w-2 h-2 rounded-full bg-amber-400" />
                          <div className="w-2 h-2 rounded-full bg-green-400" />
                        </div>
                        <div className="flex-1 flex p-4 gap-4">
                          <div className="w-1/4 space-y-2">
                             {[1, 2, 3, 4].map(i => (
                               <div key={i} className={`h-8 rounded-lg ${i===1 ? "bg-primary/10 border-primary/20 border" : "bg-muted/50"} flex items-center px-2 gap-2`}>
                                 <div className={`w-2 h-2 rounded-full ${i===1 ? "bg-primary" : "bg-muted-foreground/30"}`} />
                                 <div className={`h-1.5 w-full rounded ${i===1 ? "bg-primary/20" : "bg-muted-foreground/10"}`} />
                               </div>
                             ))}
                          </div>
                          <div className="flex-1 space-y-4">
                             <div className="grid grid-cols-2 gap-4">
                               <div className="h-20 bg-primary/5 border border-primary/20 rounded-xl p-3 flex flex-col justify-center items-center">
                                 <div className="text-[8px] font-bold text-muted-foreground uppercase">Tempo Médio</div>
                                 <div className="text-xl font-black text-primary">12.4 min</div>
                               </div>
                               <div className="h-20 bg-success/5 border border-success/20 rounded-xl p-3 flex flex-col justify-center items-center">
                                 <div className="text-[8px] font-bold text-muted-foreground uppercase">NPS Clínico</div>
                                 <div className="text-xl font-black text-success">9.8/10</div>
                               </div>
                             </div>
                             <div className="flex-1 bg-muted/20 rounded-xl border border-border p-3 flex flex-col gap-2">
                               <div className="h-2 w-1/3 bg-muted-foreground/20 rounded" />
                               <div className="h-24 w-full bg-gradient-to-t from-primary/10 to-transparent border-b border-primary/30" />
                             </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-success">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="text-sm font-bold uppercase tracking-tighter">Insights & Analytics Realtime</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
