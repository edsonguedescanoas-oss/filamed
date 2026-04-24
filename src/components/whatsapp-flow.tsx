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
import { ArrowRight, MessageCircle, Building2, Stethoscope, User } from "lucide-react";

export function WhatsAppFlow() {
  const [formData, setFormData] = useState({
    nome: "",
    unidade: "",
    tipo: ""
  });

  const [step, setStep] = useState(1);

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else handleWhatsAppRedirect();
  };

  const handleWhatsAppRedirect = () => {
    const text = `Olá! Meu nome é ${formData.nome}. Gostaria de saber mais sobre o FilaMed para a minha clínica.\n\n*Detalhes:*\n- Unidade/Local: ${formData.unidade}\n- Tipo de Clínica: ${formData.tipo}`;
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/5511999999999?text=${encodedText}`, "_blank");
  };

  return (
    <Dialog onOpenChange={(open) => !open && setStep(1)}>
      <DialogTrigger asChild>
        <Button size="lg" className="h-14 px-10 bg-gradient-primary shadow-elegant hover:scale-[1.02] transition-transform group text-lg font-semibold rounded-xl w-full sm:w-auto">
          Começar agora
          <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-3xl p-8 border border-primary/20 bg-background/95 backdrop-blur-xl">
        <DialogHeader className="mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 mx-auto">
            <MessageCircle className="h-6 w-6" />
          </div>
          <DialogTitle className="text-2xl font-bold text-center">Falar com Especialista</DialogTitle>
          <DialogDescription className="text-center">
            Responda 3 perguntas rápidas para personalizarmos seu atendimento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex justify-between mb-2">
             {[1, 2, 3].map(i => (
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
                <Label htmlFor="tipo" className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-primary" />
                  Tipo de Clínica / Especialidade
                </Label>
                <Input 
                  id="tipo" 
                  placeholder="Ex: Odontologia, Pronto Atendimento, etc." 
                  className="rounded-xl h-12 border-border/50 focus:border-primary/50"
                  value={formData.tipo}
                  onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                />
              </div>
            </div>
          )}

          <Button 
            onClick={handleNext} 
            disabled={
              (step === 1 && !formData.nome) || 
              (step === 2 && !formData.unidade) || 
              (step === 3 && !formData.tipo)
            }
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity"
          >
            {step < 3 ? "Próximo" : "Finalizar e ir para WhatsApp"}
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
