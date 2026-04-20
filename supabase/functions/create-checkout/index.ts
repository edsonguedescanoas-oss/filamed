import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createStripeClient, corsHeaders, type StripeEnv } from "../_shared/stripe.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { priceId, returnUrl, environment } = await req.json();

    if (!priceId || typeof priceId !== "string" || !/^[a-zA-Z0-9_-]+$/.test(priceId)) {
      return new Response(JSON.stringify({ error: "Invalid priceId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth opcional — se logado, captura user/unidade
    const authHeader = req.headers.get("authorization")?.replace("Bearer ", "");
    let userId: string | null = null;
    let unidadeId: string | null = null;
    let customerEmail: string | undefined;

    if (authHeader) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!
      );
      const { data: { user } } = await supabase.auth.getUser(authHeader);
      if (user) {
        userId = user.id;
        customerEmail = user.email;
        const admin = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        const { data: profile } = await admin
          .from("profiles")
          .select("unidade_id")
          .eq("id", user.id)
          .single();
        unidadeId = profile?.unidade_id ?? null;
      }
    }

    const env = (environment || "sandbox") as StripeEnv;
    const stripe = createStripeClient(env);

    const prices = await stripe.prices.list({ lookup_keys: [priceId] });
    if (!prices.data.length) {
      return new Response(JSON.stringify({ error: "Price not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const stripePrice = prices.data[0];
    const isRecurring = stripePrice.type === "recurring";
    const origin = req.headers.get("origin") || "https://filamed.com.br";

    // Pix e boleto NÃO suportam assinaturas recorrentes nem trial no Stripe.
    // Para assinaturas, apenas cartão é aceito. Para pagamentos avulsos (BRL),
    // habilitamos card + pix + boleto para aumentar a conversão no Brasil.
    const paymentMethodTypes = isRecurring
      ? ["card"]
      : ["card", "boleto", "pix"];

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      mode: isRecurring ? "subscription" : "payment",
      ui_mode: "embedded",
      payment_method_types: paymentMethodTypes as any,
      return_url:
        returnUrl ||
        `${origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      ...(customerEmail && { customer_email: customerEmail }),
      ...(!isRecurring && {
        payment_method_options: {
          boleto: {
            expires_after_days: 3,
          },
          pix: {
            expires_after_seconds: 3600, // 1h para pagar
          },
        },
      }),
      ...(isRecurring && {
        subscription_data: {
          trial_period_days: 14,
          metadata: {
            ...(userId && { userId }),
            ...(unidadeId && { unidadeId }),
            priceId,
          },
        },
      }),
      metadata: {
        ...(userId && { userId }),
        ...(unidadeId && { unidadeId }),
        priceId,
      },
    });

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("create-checkout error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
