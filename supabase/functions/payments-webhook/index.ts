import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verifyWebhook, type StripeEnv } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const STATUS_MAP: Record<string, string> = {
  trialing: "trialing",
  active: "ativa",
  past_due: "inadimplente",
  unpaid: "inadimplente",
  canceled: "cancelada",
  incomplete: "trialing",
  incomplete_expired: "cancelada",
  paused: "pausada",
};

async function findPlanoByPriceId(priceId: string) {
  const { data } = await supabase
    .from("planos")
    .select("id, gateway_price_id_mensal, gateway_price_id_anual")
    .or(`gateway_price_id_mensal.eq.${priceId},gateway_price_id_anual.eq.${priceId}`)
    .maybeSingle();
  if (!data) return null;
  const ciclo = data.gateway_price_id_anual === priceId ? "anual" : "mensal";
  return { plano_id: data.id, ciclo };
}

async function handleSubscriptionEvent(subscription: any, env: StripeEnv) {
  const meta = subscription.metadata || {};
  const unidadeId = meta.unidadeId || subscription.items?.data?.[0]?.price?.metadata?.unidadeId;
  const priceMetaId =
    subscription.items?.data?.[0]?.price?.metadata?.lovable_external_id || meta.priceId;

  if (!unidadeId) {
    console.warn("subscription event without unidadeId in metadata", subscription.id);
    return;
  }

  const lookup = priceMetaId ? await findPlanoByPriceId(priceMetaId) : null;
  if (!lookup) {
    console.warn("could not resolve plano for price", priceMetaId);
    return;
  }

  const status = STATUS_MAP[subscription.status] || "trialing";
  const periodEnd = subscription.current_period_end;
  const canceladaEm = subscription.canceled_at
    ? new Date(subscription.canceled_at * 1000).toISOString()
    : null;

  const payload = {
    unidade_id: unidadeId,
    plano_id: lookup.plano_id,
    ciclo: lookup.ciclo,
    status,
    gateway: "stripe",
    gateway_subscription_id: subscription.id,
    gateway_customer_id: subscription.customer,
    proximo_ciclo_em: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancelar_no_fim_do_ciclo: subscription.cancel_at_period_end || false,
    cancelada_em: canceladaEm,
    metadata: { environment: env, stripe_status: subscription.status },
  };

  // Upsert por unidade (UNIQUE constraint em assinaturas.unidade_id)
  const { data: existing } = await supabase
    .from("assinaturas")
    .select("id")
    .eq("unidade_id", unidadeId)
    .maybeSingle();

  if (existing) {
    await supabase.from("assinaturas").update(payload).eq("id", existing.id);
  } else {
    const { data: inserted } = await supabase
      .from("assinaturas")
      .insert(payload)
      .select("id")
      .single();
    if (inserted) {
      await supabase
        .from("unidades")
        .update({ assinatura_id: inserted.id, status_assinatura: status === "ativa" ? "ativo" : "trial" })
        .eq("id", unidadeId);
    }
  }

  // Atualiza status_assinatura na unidade
  const statusUnidade =
    status === "ativa" || status === "trialing"
      ? status === "ativa"
        ? "ativo"
        : "trial"
      : status === "cancelada"
        ? "cancelado"
        : "suspenso";
  await supabase
    .from("unidades")
    .update({ status_assinatura: statusUnidade })
    .eq("id", unidadeId);
}

async function handleInvoiceEvent(invoice: any, env: StripeEnv, eventType: string) {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return;

  const { data: assinatura } = await supabase
    .from("assinaturas")
    .select("id, unidade_id")
    .eq("gateway_subscription_id", subscriptionId)
    .maybeSingle();

  if (!assinatura) {
    console.warn("invoice event sem assinatura local", invoice.id);
    return;
  }

  const status =
    eventType === "invoice.payment_succeeded"
      ? "paga"
      : eventType === "invoice.payment_failed"
        ? "falhou"
        : "aberta";

  const pagaEm =
    invoice.status_transitions?.paid_at &&
    new Date(invoice.status_transitions.paid_at * 1000).toISOString();

  const vencimento = invoice.due_date
    ? new Date(invoice.due_date * 1000).toISOString().slice(0, 10)
    : new Date(invoice.created * 1000).toISOString().slice(0, 10);

  const payload = {
    unidade_id: assinatura.unidade_id,
    assinatura_id: assinatura.id,
    gateway_invoice_id: invoice.id,
    gateway_payment_id: invoice.payment_intent || null,
    numero: invoice.number || invoice.id,
    linha_descricao: invoice.lines?.data?.[0]?.description || "Assinatura FilaMed",
    valor_centavos: invoice.amount_paid || invoice.amount_due || 0,
    moeda: (invoice.currency || "brl").toUpperCase(),
    status,
    paga_em: pagaEm || null,
    vencimento,
    url_recibo: invoice.hosted_invoice_url || null,
    metadata: { environment: env, stripe_status: invoice.status },
  };

  // Upsert por gateway_invoice_id
  const { data: existing } = await supabase
    .from("faturas")
    .select("id")
    .eq("gateway_invoice_id", invoice.id)
    .maybeSingle();

  if (existing) {
    await supabase.from("faturas").update(payload).eq("id", existing.id);
  } else {
    await supabase.from("faturas").insert(payload);
  }
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const url = new URL(req.url);
  const env = (url.searchParams.get("env") || "sandbox") as StripeEnv;

  try {
    const event = await verifyWebhook(req, env);
    console.log("webhook event:", event.type, event.id, "env:", env);

    // Idempotência
    const { error: dupErr } = await supabase
      .from("webhook_events")
      .insert({
        gateway: "stripe",
        event_id: event.id,
        event_type: event.type,
        environment: env,
        payload: event,
      });

    if (dupErr && dupErr.code === "23505") {
      console.log("duplicate event, skipping:", event.id);
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionEvent(event.data.object, env);
        break;
      case "invoice.payment_succeeded":
      case "invoice.payment_failed":
      case "invoice.finalized":
        await handleInvoiceEvent(event.data.object, env, event.type);
        break;
      case "checkout.session.completed":
        console.log("checkout completed:", event.data.object.id);
        break;
      default:
        console.log("unhandled event:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("webhook error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});
