import { useCallback, useMemo } from "react";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createCheckoutSession, getStripe } from "@/lib/stripe";

interface CheckoutDialogProps {
  open: boolean;
  onClose: () => void;
  priceId: string | null;
  planoNome?: string;
  ciclo?: "mensal" | "anual";
}

export function CheckoutDialog({
  open,
  onClose,
  priceId,
  planoNome,
  ciclo,
}: CheckoutDialogProps) {
  const stripePromise = useMemo(() => (open && priceId ? getStripe() : null), [open, priceId]);

  const fetchClientSecret = useCallback(async () => {
    if (!priceId) throw new Error("Price ID não definido");
    return createCheckoutSession({ priceId });
  }, [priceId]);

  const options = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="font-display text-xl">
            Assinar {planoNome ?? "plano"}
            {ciclo && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                · {ciclo === "anual" ? "Anual (2 meses grátis)" : "Mensal"}
              </span>
            )}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            14 dias de trial sem cobrança. Cancele quando quiser pelo painel.
          </p>
        </DialogHeader>
        <div className="p-6 pt-4">
          {open && priceId && stripePromise && (
            <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
