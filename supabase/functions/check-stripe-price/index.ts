import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createStripeClient, corsHeaders, type StripeEnv } from "../_shared/stripe.ts";

interface CheckBody {
  priceId: string;
  environment?: StripeEnv;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { priceId, environment } = (await req.json()) as CheckBody;
    if (
      !priceId ||
      typeof priceId !== "string" ||
      !/^price_[A-Za-z0-9]+$/.test(priceId) ||
      priceId.length < 10 ||
      priceId.length > 200
    ) {
      return new Response(
        JSON.stringify({ exists: false, active: false, error: "Invalid priceId format" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const env = (environment || "sandbox") as StripeEnv;
    const stripe = createStripeClient(env);

    try {
      const price = await stripe.prices.retrieve(priceId);
      return new Response(
        JSON.stringify({
          exists: true,
          active: Boolean(price.active),
          currency: price.currency,
          unit_amount: price.unit_amount,
          recurring_interval: price.recurring?.interval ?? null,
          type: price.type,
          product: typeof price.product === "string" ? price.product : price.product?.id ?? null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (e: any) {
      // Stripe lança erro se não existir
      const msg = e?.message || String(e);
      const notFound =
        e?.statusCode === 404 ||
        e?.code === "resource_missing" ||
        msg.toLowerCase().includes("no such price");
      if (notFound) {
        return new Response(
          JSON.stringify({ exists: false, active: false, error: "Price not found" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw e;
    }
  } catch (error: any) {
    console.error("check-stripe-price error:", error);
    return new Response(
      JSON.stringify({ exists: false, active: false, error: error.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
