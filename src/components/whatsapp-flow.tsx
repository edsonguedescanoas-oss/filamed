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
import { ArrowRight, MessageCircle, Building2, Stethoscope, User, Mail, Phone } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";

// Mapeamento de DDDs para Estados (UF)
const DDD_STATE_MAP: Record<number, string> = {
  11: "SP", 12: "SP", 13: "SP", 14: "SP", 15: "SP", 16: "SP", 17: "SP", 18: "SP", 19: "SP",
  21: "RJ", 22: "RJ", 24: "RJ",
  27: "ES", 28: "ES",
  31: "MG", 32: "MG", 33: "MG", 34: "MG", 35: "MG", 37: "MG", 38: "MG",
  41: "PR", 42: "PR", 43: "PR", 44: "PR", 45: "PR", 46: "PR",
  47: "SC", 48: "SC", 49: "SC",
  51: "RS", 53: "RS", 54: "RS", 55: "RS",
  61: "DF/GO", 62: "GO", 64: "GO",
  63: "TO",
  65: "MT", 66: "MT",
  67: "MS",
  68: "AC",
  69: "RO",
  71: "BA", 73: "BA", 74: "BA", 75: "BA", 77: "BA",
  79: "SE",
  81: "PE", 87: "PE",
  82: "AL",
  83: "PB",
  84: "RN",
  85: "CE", 88: "CE",
  86: "PI", 89: "PI",
  91: "PA", 93: "PA", 94: "PA",
  92: "AM", 97: "AM",
  95: "RR",
  96: "AP",
  98: "MA", 99: "MA"
};

const VALID_DDDS = new Set(Object.keys(DDD_STATE_MAP).map(Number));

function getStateFromPhone(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 2) {
    const ddd = parseInt(digits.slice(0, 2), 10);
    return DDD_STATE_MAP[ddd] || null;
  }
  return null;
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function validatePhone(value: string): { ok: boolean; error?: string } {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 11) {
    return { ok: false, error: "Telefone deve ter 10 ou 11 dígitos (com DDD)." };
  }
  const ddd = parseInt(digits.slice(0, 2), 10);
  if (!VALID_DDDS.has(ddd)) {
    return { ok: false, error: `DDD ${digits.slice(0, 2)} inválido. Verifique o número.` };
  }
  if (digits.length === 11 && digits[2] !== "9") {
    return { ok: false, error: "Celular deve começar com 9 após o DDD." };
  }
  return { ok: true };
}

export function WhatsAppFlow({ trigger }: { trigger?: React.ReactNode }) {
  const [formData, setFormData] = useState({
    nome: "",
    unidade: "",
    tipo: "",
    email: "",
    telefone: ""
  });

  const [step, setStep] = useState(1);
  const totalSteps = 5;

  const handleNext = () => {
    if (step === 3) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.error("Por favor, insira um e-mail válido.");
        return;
      }
    }
    if (step === 4) {
      const result = validatePhone(formData.telefone);
      if (!result.ok) {
        toast.error(result.error!);
        return;
      }
    }
    if (step < totalSteps) setStep(step + 1);
    else handleWhatsAppRedirect();
  };

  const handleWhatsAppRedirect = () => {
    const { nome, unidade, tipo, telefone } = formData;
    
    // Track Form Submission and WhatsApp Click
    trackEvent("form_submission", {
      form_name: "whatsapp_flow",
      user_name: nome,
      unit_name: unidade,
      unit_type: tipo,
      phone: telefone
    });
    
    trackEvent("whatsapp_click", {
      location: "flow_dialog",
      unit_type: tipo
    });

    const customMessage = `Olá! Me chamo ${nome} (${unidade}). Gostaria de uma demonstração do FilaMed para minha unidade de ${tipo}. Contato: ${telefone}`;

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
             {[1, 2, 3, 4, 5].map(i => (
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
              <div className="space-y-2">
                <Label htmlFor="telefone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  Telefone com DDD (WhatsApp)
                </Label>
                <Input 
                  id="telefone" 
                  type="tel"
                  inputMode="numeric"
                  placeholder="(11) 99999-9999" 
                  className="rounded-xl h-12 border-border/50 focus:border-primary/50"
                  value={formData.telefone}
                  onChange={(e) => setFormData({...formData, telefone: maskPhone(e.target.value)})}
                  maxLength={16}
                />
                {getStateFromPhone(formData.telefone) && (
                  <p className="text-xs font-medium text-primary animate-fade-in">
                    Estado identificado: {getStateFromPhone(formData.telefone)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Informe DDD + número. Celulares devem começar com 9.
                </p>
              </div>
            </div>
          )}

          {step === 5 && (
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
              (step === 4 && !formData.telefone) ||
              (step === 5 && !formData.tipo)
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
