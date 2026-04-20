import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { supabase } from "@/integrations/supabase/client";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function getStripeEnvironment(): "sandbox" | "live" {
  return clientToken?.startsWith("pk_test_") ? "sandbox" : "live";
}

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    if (!clientToken) {
      throw new Error("VITE_PAYMENTS_CLIENT_TOKEN não configurado");
    }
    stripePromise = loadStripe(clientToken);
  }
  return stripePromise;
}

export async function createCheckoutSession(opts: {
  priceId: string;
  returnUrl?: string;
}): Promise<string> {
  const { data, error } = await supabase.functions.invoke("create-checkout", {
    body: {
      priceId: opts.priceId,
      returnUrl: opts.returnUrl,
      environment: getStripeEnvironment(),
    },
  });
  if (error || !data?.clientSecret) {
    throw new Error(error?.message || "Falha ao criar sessão de checkout");
  }
  return data.clientSecret as string;
}
