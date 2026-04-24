import { useState } from "react";
import { Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Props = {
  unidadeId: string | null | undefined;
  onZerado?: () => void;
};

export function ZerarFilasButton({ unidadeId, onZerado }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");
  const [loading, setLoading] = useState(false);
  const palavraConfirmacao = "ZERAR";

  const handleConfirmar = async () => {
    if (!unidadeId) return;
    if (confirmacao.trim().toUpperCase() !== palavraConfirmacao) {
      toast.error(`Digite "${palavraConfirmacao}" para confirmar`);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("zerar_filas_unidade", {
        _unidade_id: unidadeId,
      });
      if (error) throw error;
      const total = (data as { senhas_canceladas?: number } | null)?.senhas_canceladas ?? 0;
      toast.success(
        total > 0
          ? `${total} senha(s) cancelada(s). O histórico permanece para auditoria.`
          : "Não havia senhas em espera para cancelar.",
      );
      setConfirmacao("");
      setOpen(false);
      onZerado?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao zerar filas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setConfirmacao("");
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
          Zerar filas
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Zerar todas as filas?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p>
                Esta ação cancela <strong>todas as senhas em espera, chamadas e em
                atendimento</strong> desta unidade. Os atendimentos em andamento
                serão interrompidos.
              </p>
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-destructive">
                <p className="font-semibold">⚠️ Ação irreversível</p>
                <p className="text-xs mt-1 opacity-90">
                  Não é possível desfazer. O histórico permanece visível em
                  relatórios e na auditoria, mas as senhas não voltam para a fila.
                </p>
              </div>
              <div className="space-y-2 pt-1">
                <Label htmlFor="zerar-confirmacao" className="text-foreground">
                  Para confirmar, digite <strong>{palavraConfirmacao}</strong>:
                </Label>
                <Input
                  id="zerar-confirmacao"
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                  placeholder={palavraConfirmacao}
                  autoComplete="off"
                  disabled={loading}
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void handleConfirmar();
            }}
            disabled={loading || confirmacao.trim().toUpperCase() !== palavraConfirmacao}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Sim, zerar filas
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
