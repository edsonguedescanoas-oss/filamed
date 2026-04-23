// ... keep existing code
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Settings2, Monitor } from "lucide-react";

// ... inside TicketShareDialog
  const [selectedPrinter, setSelectedPrinter] = useState<string>(() => {
    return localStorage.getItem('filamed_selected_printer') || 'standard_80';
  });

  const printers = [
    { id: 'standard_80', name: 'Térmica 80mm (Padrão)', width: '80mm' },
    { id: 'standard_58', name: 'Térmica 58mm (Padrão)', width: '58mm' },
    { id: 'desk_1', name: 'Impressora Recepção 1', width: '80mm' },
    { id: 'desk_2', name: 'Impressora Recepção 2', width: '80mm' },
  ];

  const currentPrinter = printers.find(p => p.id === selectedPrinter) || printers[0];

  useEffect(() => {
    localStorage.setItem('filamed_selected_printer', selectedPrinter);
  }, [selectedPrinter]);

// ... update handlePrint to use currentPrinter.width
// ... update DialogContent to show the Select component

import { Button } from "@/components/ui/button";
import { QrCode } from "@/components/qr-code";
import { 
  MessageSquare, 
  Copy, 
  Check, 
  Share2, 
  Printer, 
  Loader2, 
  AlertCircle,
  Settings2,
  Monitor
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unidadeId: string | null;
  senha: {
    id: string;
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
  unidadeId,
  senha,
  paciente,
  unidadeNome,
  logoUrl,
  rodape,
  autoPrint = false,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [lastStatus, setLastStatus] = useState<Record<string, 'sent' | 'failed' | 'idle'>>({
    whatsapp: 'idle',
    print: 'idle',
    share: 'idle'
  });
  
  const [selectedPrinter, setSelectedPrinter] = useState<string>(() => {
    return localStorage.getItem('filamed_selected_printer') || 'standard_80';
  });

  const printers = [
    { id: 'standard_80', name: 'Térmica 80mm (Padrão)', width: '80mm' },
    { id: 'standard_58', name: 'Térmica 58mm (Padrão)', width: '58mm' },
    { id: 'desk_1', name: 'Impressora Recepção 1', width: '80mm' },
    { id: 'desk_2', name: 'Impressora Recepção 2', width: '80mm' },
  ];

  const currentPrinter = printers.find(p => p.id === selectedPrinter) || printers[0];

  useEffect(() => {
    localStorage.setItem('filamed_selected_printer', selectedPrinter);
  }, [selectedPrinter]);
  
  const ticketRef = useRef<HTMLDivElement>(null);
  const printTriggered = useRef(false);

  useEffect(() => {
    if (open && autoPrint && senha && paciente && !printTriggered.current) {
      printTriggered.current = true;
      void handlePrint();
    }
    if (!open) {
      printTriggered.current = false;
      setLastStatus({ whatsapp: 'idle', print: 'idle', share: 'idle' });
    }
  }, [open, autoPrint, senha, paciente]);

  if (!senha || !paciente) return null;

  const publicUrl = `${window.location.origin}/s/${senha.token_publico}`;

  const recordNotification = async (canal: string, status: 'enviada' | 'falhou') => {
    if (!unidadeId || !senha?.id) return;
    
    try {
      const payload: any = {
        unidade_id: unidadeId,
        senha_id: senha.id,
        canal: (canal === 'print' || canal === 'share') ? 'push' : canal,
        destinatario: canal === 'whatsapp' ? (paciente.telefone || 'Sem telefone') : 'Ticket Físico',
        mensagem: `Ticket ${senha.codigo} por ${canal}`,
        status: status
      };
      await supabase.from('notificacoes_log').insert(payload);
    } catch (err) {
      console.error('Erro ao gravar log:', err);
    }
  };

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

  const handleWhatsApp = async () => {
    if (!paciente.telefone) {
      toast.error("Paciente sem telefone cadastrado");
      return;
    }
    
    setSending('whatsapp');
    try {
      const tel = paciente.telefone.replace(/\D/g, "");
      const text = encodeURIComponent(
        `Olá ${paciente.nome_completo}, sua senha no ${unidadeNome || "nosso estabelecimento"} é: *${senha.codigo}*.\n\nAcompanhe o status do seu atendimento em tempo real clicando no link abaixo:\n${publicUrl}`
      );
      window.open(`https://wa.me/${tel}?text=${text}`, "_blank");
      
      await recordNotification('whatsapp', 'enviada');
      setLastStatus(prev => ({ ...prev, whatsapp: 'sent' }));
      toast.success("WhatsApp aberto!");
    } catch (err) {
      await recordNotification('whatsapp', 'falhou');
      setLastStatus(prev => ({ ...prev, whatsapp: 'failed' }));
    } finally {
      setSending(null);
    }
  };

  const handlePrint = async () => {
    setSending('print');
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
                width: ${currentPrinter.width}; 
                margin: 0; 
                padding: 5mm;
                text-align: center;
                color: #000;
              }
              .logo { max-width: 40mm; max-height: 20mm; object-contain: fit; margin-bottom: 5mm; }
              .unidade { font-size: 11pt; font-weight: bold; text-transform: uppercase; margin-bottom: 5mm; line-height: 1.2; }
              .label { font-size: 9pt; font-weight: bold; color: #000; letter-spacing: 2px; margin-bottom: 2mm; }
              .senha { font-size: ${currentPrinter.width === '58mm' ? '45pt' : '60pt'}; font-weight: 900; margin: 2mm 0; line-height: 1; }
              .paciente { font-size: 11pt; font-weight: bold; margin-bottom: 5mm; margin-top: 2mm; }
              .qrcode-container { margin: 5mm 0; display: flex; flex-direction: column; align-items: center; }
              .qrcode { width: 30mm; height: 30mm; }
              .footer { font-size: 8pt; color: #000; margin-top: 5mm; border-top: 1px dashed #000; padding-top: 3mm; font-weight: bold; }
              .timestamp { font-size: 7pt; margin-top: 2mm; }
              @media print {
                body { width: ${currentPrinter.width}; }
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
      
      await recordNotification('print', 'enviada');
      setLastStatus(prev => ({ ...prev, print: 'sent' }));
      toast.success("Enviando para impressora...");
    } catch (err) {
      setLastStatus(prev => ({ ...prev, print: 'failed' }));
      toast.error("Erro ao gerar impressão");
    } finally {
      setSending(null);
    }
  };

  const handleShare = async () => {
    setSending('share');
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Sua Senha - FilaMed",
          text: `Olá ${paciente.nome_completo}, sua senha no ${unidadeNome || "nosso estabelecimento"} é ${senha.codigo}`,
          url: publicUrl,
        });
        await recordNotification('share', 'enviada');
        setLastStatus(prev => ({ ...prev, share: 'sent' }));
      } catch (err) {
        // user cancelled
      } finally {
        setSending(null);
      }
    } else {
      handleCopy();
      setSending(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-950 border-white/10 text-white overflow-hidden p-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-white text-center flex items-center justify-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            Prévia do Ticket
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 p-6">
          <div className="w-full space-y-2">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Settings2 className="h-3 w-3" />
              Dispositivo de Impressão
            </Label>
            <Select value={selectedPrinter} onValueChange={setSelectedPrinter}>
              <SelectTrigger className="bg-slate-900 border-white/10 text-white h-10">
                <SelectValue placeholder="Selecione a impressora" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-white">
                {printers.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="focus:bg-white/10 focus:text-white">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-slate-400" />
                      <span>{p.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div 
            ref={ticketRef}
            className={cn(
              "bg-white text-slate-950 p-6 shadow-2xl flex flex-col items-center text-center font-sans rounded-sm relative transition-all duration-300",
              currentPrinter.width === '58mm' ? "w-[220px]" : "w-[280px]"
            )}
          >
            <div className="absolute top-0 left-0 right-0 h-1 flex justify-between overflow-hidden">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-slate-900 -mt-1" />
              ))}
            </div>

            {logoUrl && (
              <div className="mb-4 mt-2 flex justify-center">
                <img src={logoUrl} alt="Logo" className="max-h-12 w-auto object-contain" />
              </div>
            )}
            
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-800 mb-1">
              {unidadeNome}
            </div>
            <div className="text-[9px] text-slate-500 mb-6">Acompanhe seu atendimento</div>

            <div className="flex flex-col items-center mb-6">
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-1">Sua Senha</div>
              <div className="text-6xl font-black tracking-tighter text-slate-900 mb-1 tabular-nums">
                {senha.codigo}
              </div>
              <div className="text-xs text-slate-700 font-bold px-2 py-1 bg-slate-100 rounded">
                {paciente.nome_completo}
              </div>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="bg-white p-1 border border-slate-100">
                <QrCode value={publicUrl} size={110} />
              </div>
              <div className="text-[9px] text-slate-900 font-bold uppercase tracking-tight">
                Escaneie para acompanhar
              </div>
            </div>

            <div className="w-full border-t border-dashed border-slate-300 mt-6 pt-4">
              <div className="text-[10px] font-medium text-slate-600 leading-tight">
                {rodape || "FILAMED - GESTÃO DE FILAS"}
              </div>
              <div className="text-[8px] mt-2 text-slate-400">
                {new Date().toLocaleString("pt-BR")}
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-1 flex justify-between overflow-hidden">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-slate-900 -mb-1" />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full mt-2">
            <Button
              onClick={handlePrint}
              disabled={sending === 'print'}
              className={cn(
                "bg-white text-slate-950 hover:bg-slate-100 gap-2 h-12 text-base font-bold flex-col py-8",
                lastStatus.print === 'sent' && "border-2 border-emerald-500"
              )}
            >
              <div className="flex items-center gap-2">
                {sending === 'print' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : lastStatus.print === 'sent' ? (
                  <Check className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Printer className="h-5 w-5" />
                )}
                {lastStatus.print === 'sent' ? "Impresso" : "Imprimir Ticket"}
              </div>
              {!sending && lastStatus.print !== 'sent' && (
                <span className="text-[10px] font-normal text-slate-500 -mt-1 uppercase tracking-tight">
                  via {currentPrinter.name}
                </span>
              )}
            </Button>
            
            <Button
              onClick={handleWhatsApp}
              variant="outline"
              disabled={!paciente.telefone || sending === 'whatsapp'}
              className={cn(
                "border-white/10 hover:bg-white/5 text-white gap-2 h-12",
                lastStatus.whatsapp === 'sent' && "border-emerald-500/50 bg-emerald-500/10"
              )}
            >
              {sending === 'whatsapp' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : lastStatus.whatsapp === 'sent' ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <MessageSquare className="h-4 w-4 text-emerald-400" />
              )}
              {lastStatus.whatsapp === 'sent' ? "Enviado" : "Enviar WhatsApp"}
            </Button>

            <Button
              onClick={handleShare}
              variant="outline"
              disabled={sending === 'share'}
              className={cn(
                "col-span-2 border-white/10 hover:bg-white/5 text-white gap-2 h-11",
                lastStatus.share === 'sent' && "border-emerald-500/50 bg-emerald-500/10"
              )}
            >
              {sending === 'share' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : lastStatus.share === 'sent' ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              {lastStatus.share === 'sent' ? "Compartilhado" : "Outras formas de enviar"}
            </Button>
            
            <Button
              onClick={handleCopy}
              variant="secondary"
              className="col-span-2 gap-2 h-11 bg-slate-800 hover:bg-slate-700 text-slate-200 border-none"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              {copied ? "Link copiado" : "Copiar link de acompanhamento"}
            </Button>
          </div>
          
          {!paciente.telefone && (
            <p className="flex items-center gap-1.5 text-[11px] text-amber-400 text-center">
              <AlertCircle className="h-3 w-3" />
              Paciente sem telefone cadastrado.
            </p>
          )}

          {Object.values(lastStatus).some(s => s === 'sent') && (
            <p className="text-[10px] text-emerald-400 font-medium animate-in fade-in slide-in-from-bottom-1">
              Ação registrada no histórico do atendimento
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
