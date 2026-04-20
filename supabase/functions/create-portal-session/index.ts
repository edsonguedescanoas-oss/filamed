import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createStripeClient, corsHeaders, type StripeEnv } from "../_shared/stripe.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { returnUrl, environment } = await req.json().catch(() => ({}));
    const env = (environment || "sandbox") as StripeEnv;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Pega unidade do usuário
    const { data: profile } = await admin
      .from("profiles")
      .select("unidade_id")
      .eq("id", user.id)
      .single();

    if (!profile?.unidade_id) {
      return new Response(JSON.stringify({ error: "Usuário sem unidade" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Busca customer_id da assinatura da unidade
    const { data: assinatura } = await admin
      .from("assinaturas")
      .select("gateway_customer_id, gateway")
      .eq("unidade_id", profile.unidade_id)
      .maybeSingle();

    if (!assinatura?.gateway_customer_id) {
      return new Response(
        JSON.stringify({
          error: "Nenhuma assinatura encontrada. Contrate um plano antes de gerenciar.",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const stripe = createStripeClient(env);
    const origin = req.headers.get("origin") || "https://filamed.com.br";

    const session = await stripe.billingPortal.sessions.create({
      customer: assinatura.gateway_customer_id,
      return_url: returnUrl || `${origin}/app/conta`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("create-portal-session error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
