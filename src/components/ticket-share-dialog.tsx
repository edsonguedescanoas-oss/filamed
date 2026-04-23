import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode } from "@/components/qr-code";
import { MessageSquare, Copy, Check, Download, Share2 } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  senha: {
    codigo: string;
    token_publico: string;
  } | null;
  paciente: {
    nome_completo: string;
    telefone: string | null;
  } | null;
  unidadeNome: string | null;
  logoUrl?: string | null;
};

export function TicketShareDialog({
  open,
  onOpenChange,
  senha,
  paciente,
  unidadeNome,
  logoUrl,
}: Props) {
  const [copied, setCopied] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);

  if (!senha || !paciente) return null;

  const publicUrl = `${window.location.origin}/s/${senha.token_publico}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Erro ao copiar link");
    }
  };

  const handleWhatsApp = () => {
    if (!paciente.telefone) {
      toast.error("Paciente sem telefone cadastrado");
      return;
    }
    const tel = paciente.telefone.replace(/\D/g, "");
    const text = encodeURIComponent(
      `Olá ${paciente.nome_completo}, sua senha no ${unidadeNome || "nosso estabelecimento"} é: *${senha.codigo}*.\n\nAcompanhe o status do seu atendimento em tempo real clicando no link abaixo:\n${publicUrl}`
    );
    window.open(`https://wa.me/${tel}?text=${text}`, "_blank");
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Sua Senha - FilaMed",
          text: `Olá ${paciente.nome_completo}, sua senha é ${senha.codigo}`,
          url: publicUrl,
        });
      } catch (err) {
        // user cancelled
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Compartilhar Senha</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {/* Ticket Preview 9x16 */}
          <div 
            ref={ticketRef}
            className="relative aspect-[9/16] w-64 rounded-3xl overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 border border-white/10 shadow-2xl flex flex-col p-6 text-center"
          >
            {logoUrl && (
              <div className="mb-4 flex justify-center">
                <img src={logoUrl} alt="Logo" className="h-10 w-auto object-contain opacity-80" />
              </div>
            )}
            
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-1">
              {unidadeNome}
            </div>
            <div className="text-[10px] text-slate-400 mb-6">Acompanhe seu atendimento</div>

            <div className="flex-1 flex flex-col justify-center">
              <div className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold mb-2">Sua Senha</div>
              <div className="text-5xl font-display font-black tracking-tighter text-white mb-2 tabular-nums">
                {senha.codigo}
              </div>
              <div className="text-xs text-slate-400 font-medium">{paciente.nome_completo}</div>
            </div>

            <div className="mt-auto flex flex-col items-center gap-4">
              <div className="bg-white p-2 rounded-xl">
                <QrCode value={publicUrl} size={100} />
              </div>
              <div className="text-[9px] text-slate-500 max-w-[140px] leading-relaxed">
                Escaneie para acompanhar ou acesse pelo link enviado.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full mt-2">
            <Button
              onClick={handleWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-12"
              disabled={!paciente.telefone}
            >
              <MessageSquare className="h-4 w-4" />
              WhatsApp
            </Button>
            <Button
              onClick={handleShare}
              variant="outline"
              className="border-white/10 hover:bg-white/5 text-white gap-2 h-12"
            >
              <Share2 className="h-4 w-4" />
              Compartilhar
            </Button>
            <Button
              onClick={handleCopy}
              variant="secondary"
              className="col-span-2 gap-2 h-11 bg-slate-800 hover:bg-slate-700 text-slate-200 border-none"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Link copiado" : "Copiar link de acompanhamento"}
            </Button>
          </div>
          
          {!paciente.telefone && (
            <p className="text-[11px] text-amber-400 text-center">
              Atenção: Paciente sem telefone cadastrado. O envio por WhatsApp não estará disponível.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
