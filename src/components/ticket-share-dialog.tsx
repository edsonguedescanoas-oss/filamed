import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode } from "@/components/qr-code";
import { MessageSquare, Copy, Check, Share2, Printer } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import QRCode from "qrcode";

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
  rodape?: string | null;
  autoPrint?: boolean;
};

export function TicketShareDialog({
  open,
  onOpenChange,
  senha,
  paciente,
  unidadeNome,
  logoUrl,
  rodape,
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

  const handlePrint = async () => {
    try {
      const qrDataUrl = await QRCode.toDataURL(publicUrl, {
        width: 128,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      });

      const printWindow = window.open("", "_blank", "width=400,height=600");
      if (!printWindow) {
        toast.error("Bloqueador de pop-ups ativado. Por favor, permita pop-ups para imprimir.");
        return;
      }

      const html = `
        <html>
          <head>
            <title>Imprimir Senha - ${senha.codigo}</title>
            <style>
              @page { margin: 0; }
              body { 
                font-family: sans-serif; 
                width: 80mm; 
                margin: 0; 
                padding: 10mm 5mm;
                text-align: center;
                color: #000;
              }
              .logo { max-width: 40mm; max-height: 20mm; object-contain: fit; margin-bottom: 5mm; }
              .unidade { font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-bottom: 8mm; line-height: 1.2; }
              .label { font-size: 10pt; font-weight: bold; color: #000; letter-spacing: 2px; margin-bottom: 2mm; }
              .senha { font-size: 60pt; font-weight: 900; margin: 2mm 0; line-height: 1; }
              .paciente { font-size: 12pt; font-weight: bold; margin-bottom: 8mm; margin-top: 2mm; }
              .qrcode-container { margin: 5mm 0; display: flex; flex-direction: column; align-items: center; }
              .qrcode { width: 35mm; height: 35mm; }
              .footer { font-size: 9pt; color: #000; margin-top: 8mm; border-top: 1px dashed #000; padding-top: 4mm; font-weight: bold; }
              .timestamp { font-size: 8pt; margin-top: 2mm; }
              @media print {
                body { width: 80mm; }
              }
            </style>
          </head>
          <body>
            ${logoUrl ? `<img src="${logoUrl}" class="logo" />` : ""}
            <div class="unidade">${unidadeNome || ""}</div>
            <div class="label">SUA SENHA</div>
            <div class="senha">${senha.codigo}</div>
            <div class="paciente">${paciente.nome_completo}</div>
            <div class="qrcode-container">
              <img src="${qrDataUrl}" class="qrcode" />
              <div style="font-size: 8pt; margin-top: 3mm; font-weight: bold;">Escaneie para acompanhar</div>
            </div>
            <div class="footer">
              ${rodape || "FILAMED - GESTÃO DE FILAS"}
              <div class="timestamp">${new Date().toLocaleString("pt-BR")}</div>
            </div>
            <script>
              window.onload = () => {
                window.print();
                setTimeout(() => window.close(), 500);
              };
            </script>
          </body>
        </html>
      `;
      printWindow.document.write(html);
      printWindow.document.close();
      toast.success("Enviando para impressora...");
    } catch (err) {
      toast.error("Erro ao gerar impressão");
      console.error(err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Sua Senha - FilaMed",
          text: `Olá ${paciente.nome_completo}, sua senha no ${unidadeNome || "nosso estabelecimento"} é ${senha.codigo}`,
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
              <div className="text-[9px] text-slate-500 max-w-[140px] leading-relaxed line-clamp-2">
                {rodape || "Escaneie para acompanhar ou acesse pelo link enviado."}
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
              Enviar
            </Button>
            <Button
              onClick={handlePrint}
              variant="outline"
              className="border-white/10 hover:bg-white/5 text-white gap-2 h-12"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
            <Button
              onClick={handleShare}
              variant="outline"
              className="col-span-2 border-white/10 hover:bg-white/5 text-white gap-2 h-11"
            >
              <Share2 className="h-4 w-4" />
              Outras formas de enviar
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
              Atenção: Paciente sem telefone cadastrado. O envio direto não estará disponível.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
