import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createStripeClient, corsHeaders, type StripeEnv } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

interface SyncBody {
  planoId: string;
  environment?: StripeEnv;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Autentica o usuário e exige super_admin
    const authHeader = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await supabase.rpc("is_super_admin", { _user_id: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: super_admin required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as SyncBody;
    if (!body.planoId) {
      return new Response(JSON.stringify({ error: "planoId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const env = (body.environment || "sandbox") as StripeEnv;

    // Carrega o plano
    const { data: plano, error: planoErr } = await supabase
      .from("planos")
      .select("*")
      .eq("id", body.planoId)
      .single();
    if (planoErr || !plano) {
      return new Response(JSON.stringify({ error: "Plano não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!plano.preco_mensal_centavos || plano.preco_mensal_centavos <= 0) {
      return new Response(
        JSON.stringify({ error: "Plano precisa de preco_mensal_centavos > 0" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const stripe = createStripeClient(env);
    const moeda = (plano.moeda || "BRL").toLowerCase();

    // 1) Garante o Product no Stripe (procura pelo metadata.lovable_plano_slug)
    const existingProducts = await stripe.products.search({
      query: `metadata['lovable_plano_slug']:'${plano.slug}' AND active:'true'`,
      limit: 1,
    });

    let product = existingProducts.data[0];
    if (!product) {
      product = await stripe.products.create({
        name: `FilaMed — ${plano.nome}`,
        description: plano.descricao ?? undefined,
        metadata: {
          lovable_plano_slug: plano.slug,
          lovable_plano_id: plano.id,
        },
      });
    }

    // 2) Cria os 3 prices
    // Calcula o anual: usa preco_anual_centavos se houver, senão 10x mensal (2 meses grátis)
    const valorMensal = plano.preco_mensal_centavos;
    const valorAnual = plano.preco_anual_centavos ?? valorMensal * 10;

    // Helper pra criar um price com lookup_key único por env+slug+ciclo
    async function createPrice(
      ciclo: "mensal" | "anual" | "anual_oneoff",
      amount: number,
      recurringInterval: "month" | "year" | null,
    ) {
      const lookupKey = `${plano.slug}_${ciclo}_${env}`;
      // Desativa lookup_key anterior se existir, pra não conflitar
      const existing = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
      if (existing.data.length > 0) {
        // Reaproveita se valor e moeda baterem
        const cur = existing.data[0];
        if (
          cur.unit_amount === amount &&
          cur.currency === moeda &&
          (recurringInterval ? cur.recurring?.interval === recurringInterval : !cur.recurring)
        ) {
          return cur.id;
        }
        // Caso contrário, libera o lookup_key e cria novo (Stripe não permite update de unit_amount)
        await stripe.prices.update(cur.id, { lookup_key: null as any, active: false });
      }

      const price = await stripe.prices.create({
        product: product!.id,
        unit_amount: amount,
        currency: moeda,
        lookup_key: lookupKey,
        nickname: `${plano.nome} — ${ciclo}`,
        ...(recurringInterval ? { recurring: { interval: recurringInterval } } : {}),
        metadata: {
          lovable_plano_slug: plano.slug,
          lovable_plano_id: plano.id,
          lovable_ciclo: ciclo,
        },
      });
      return price.id;
    }

    const [mensalId, anualId, anualOneoffId] = await Promise.all([
      createPrice("mensal", valorMensal, "month"),
      createPrice("anual", valorAnual, "year"),
      createPrice("anual_oneoff", valorAnual, null),
    ]);

    // 3) Atualiza o plano no DB
    const { error: updErr } = await supabase
      .from("planos")
      .update({
        gateway_price_id_mensal: mensalId,
        gateway_price_id_anual: anualId,
        gateway_price_id_anual_oneoff: anualOneoffId,
      })
      .eq("id", plano.id);

    if (updErr) {
      return new Response(JSON.stringify({ error: "Falha ao salvar IDs: " + updErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        product_id: product.id,
        prices: {
          mensal: mensalId,
          anual: anualId,
          anual_oneoff: anualOneoffId,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("sync-plano-stripe error:", error);
    return new Response(JSON.stringify({ error: error.message || String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
