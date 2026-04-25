import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import { ArrowRight, MessageCircle, Building2, Stethoscope, User, Mail } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export function WhatsAppFlow({ trigger }: { trigger?: React.ReactNode }) {
  const [formData, setFormData] = useState({
    nome: "",
    unidade: "",
    tipo: "",
    email: ""
  });

  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
    else handleWhatsAppRedirect();
  };

  const handleWhatsAppRedirect = () => {
    const { nome, unidade, tipo } = formData;
    
    // Track Form Submission and WhatsApp Click
    trackEvent("form_submission", {
      form_name: "whatsapp_flow",
      user_name: nome,
      unit_name: unidade,
      unit_type: tipo
    });
    
    trackEvent("whatsapp_click", {
      location: "flow_dialog",
      unit_type: tipo
    });

    let customMessage = "";
    const tipoLower = tipo.toLowerCase();

    if (tipoLower.includes("odont") || tipoLower.includes("dent")) {
      customMessage = `Olá! Meu nome é ${nome} e sou da clínica ${unidade}. Gostaria de entender como o FilaMed pode me ajudar a organizar melhor as consultas odontológicas e reduzir as faltas dos pacientes.`;
    } else if (tipoLower.includes("estét") || tipoLower.includes("estet") || tipoLower.includes("dermato")) {
      customMessage = `Olá! Meu nome é ${nome} e sou da ${unidade}. Atuamos na área de estética e gostaria de saber como o FilaMed pode elevar a experiência dos nossos clientes e otimizar nossa agenda de procedimentos.`;
    } else if (tipoLower.includes("pronto") || tipoLower.includes("atendimento") || tipoLower.includes("emergência") || tipoLower.includes("urgência")) {
      customMessage = `Olá! Meu nome é ${nome} e falo do ${unidade}. Temos um fluxo intenso de pronto atendimento e gostaria de saber como o FilaMed pode nos ajudar a gerenciar as filas de espera e o tempo de atendimento em tempo real.`;
    } else {
      customMessage = `Olá! Meu nome é ${nome}. Gostaria de saber mais sobre como o FilaMed pode modernizar o atendimento da minha clínica (${unidade}), que atua na área de ${tipo}.`;
    }

    const encodedText = encodeURIComponent(customMessage);
    window.open(`https://wa.me/5511999999999?text=${encodedText}`, "_blank");
  };

  return (
    <Dialog onOpenChange={(open) => !open && setStep(1)}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="lg" className="h-14 px-10 bg-gradient-primary shadow-elegant hover:scale-[1.02] transition-transform group text-lg font-semibold rounded-xl w-full sm:w-auto">
            Começar agora
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-3xl p-8 border border-primary/20 bg-background/95 backdrop-blur-xl">
        <DialogHeader className="mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 mx-auto">
            <MessageCircle className="h-6 w-6" />
          </div>
          <DialogTitle className="text-2xl font-bold text-center">Falar com Especialista</DialogTitle>
          <DialogDescription className="text-center">
            Responda {totalSteps} perguntas rápidas para personalizarmos seu atendimento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex justify-between mb-2">
             {[1, 2, 3, 4].map(i => (
               <div key={i} className={`h-1.5 flex-1 mx-1 rounded-full transition-colors ${step >= i ? 'bg-primary' : 'bg-muted'}`} />
             ))}
          </div>

          {step === 1 && (
            <div className="animate-fade-in space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Qual o seu nome?
                </Label>
                <Input 
                  id="nome" 
                  placeholder="Seu nome completo" 
                  className="rounded-xl h-12 border-border/50 focus:border-primary/50"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in space-y-4">
              <div className="space-y-2">
                <Label htmlFor="unidade" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Nome da Clínica / Unidade
                </Label>
                <Input 
                  id="unidade" 
                  placeholder="Ex: Clínica Sorriso Central" 
                  className="rounded-xl h-12 border-border/50 focus:border-primary/50"
                  value={formData.unidade}
                  onChange={(e) => setFormData({...formData, unidade: e.target.value})}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  Seu E-mail Corporativo
                </Label>
                <Input 
                  id="email" 
                  type="email"
                  placeholder="Ex: gestao@clinica.com.br" 
                  className="rounded-xl h-12 border-border/50 focus:border-primary/50"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-fade-in space-y-4">
              <div className="space-y-4">
                <Label htmlFor="tipo" className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-primary" />
                  Qual a especialidade da clínica?
                </Label>
                
                <div className="grid grid-cols-1 gap-2">
                  {[
                    "Odontologia", 
                    "Estética", 
                    "Pronto Atendimento", 
                    "Clínica Médica",
                    "Outro"
                  ].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setFormData({...formData, tipo: option})}
                      className={`text-left px-4 py-3 rounded-xl border transition-all ${
                        formData.tipo === option 
                          ? 'bg-primary/10 border-primary text-primary font-medium' 
                          : 'bg-muted/30 border-border/50 hover:bg-muted/50'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                {formData.tipo === "Outro" && (
                  <Input 
                    id="tipo-outro" 
                    placeholder="Digite sua especialidade..." 
                    className="rounded-xl h-12 border-border/50 focus:border-primary/50 mt-2"
                    onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                  />
                )}
              </div>
            </div>
          )}

          <Button 
            onClick={handleNext} 
            disabled={
              (step === 1 && !formData.nome) || 
              (step === 2 && !formData.unidade) || 
              (step === 3 && !formData.email) ||
              (step === 4 && !formData.tipo)
            }
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity"
          >
            {step < totalSteps ? "Próximo" : "Finalizar e ir para WhatsApp"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          
          <p className="text-[10px] text-center text-muted-foreground uppercase font-bold tracking-widest">
            Atendimento 100% humanizado
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
