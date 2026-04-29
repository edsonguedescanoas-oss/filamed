import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Webhook para receber mensagens do WaDuck e salvar no CRM.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    console.log("WaDuck Webhook received:", JSON.stringify(body));

    // WaDuck structure varies by instance, but typically:
    // { event: "message", data: { from: "55119...", body: "olá", id: "..." } }
    // or sometimes just the message object if it's a direct webhook.
    
    const event = body.event || "message";
    const data = body.data || body;

    if (event !== "message") {
      return new Response(JSON.stringify({ status: "ignored", event }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const from = data.from || data.remoteJid || data.participant;
    if (!from) {
      throw new Error("No sender information found in webhook data");
    }

    // Limpar o número (remover @s.whatsapp.net etc)
    const cleanPhone = from.split("@")[0].replace(/\D/g, "");
    const messageContent = data.body || data.text || data.caption || "";
    const waMessageId = data.id || data.key?.id;

    if (!messageContent && !data.media) {
       console.log("Empty message, ignoring");
       return new Response(JSON.stringify({ status: "ignored", reason: "empty" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Encontrar ou criar contato
    let { data: contato, error: contatoErr } = await supabaseClient
      .from("crm_contatos")
      .select("id")
      .eq("telefone", cleanPhone)
      .maybeSingle();

    if (contatoErr) throw contatoErr;

    if (!contato) {
      const { data: newContato, error: createErr } = await supabaseClient
        .from("crm_contatos")
        .insert({ 
          telefone: cleanPhone,
          nome: data.pushName || `WhatsApp ${cleanPhone.slice(-4)}`
        })
        .select("id")
        .single();
      
      if (createErr) throw createErr;
      contato = newContato;
    }

    // 2. Encontrar ou criar conversa aberta
    let { data: conversa, error: conversaErr } = await supabaseClient
      .from("crm_conversas")
      .select("id")
      .eq("contato_id", contato.id)
      .neq("status", "resolvido")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (conversaErr) throw conversaErr;

    if (!conversa) {
      const { data: newConversa, error: createConvErr } = await supabaseClient
        .from("crm_conversas")
        .insert({ 
          contato_id: contato.id,
          status: "aberto"
        })
        .select("id")
        .single();
      
      if (createConvErr) throw createConvErr;
      conversa = newConversa;
    }

    // 3. Salvar mensagem
    const { error: msgErr } = await supabaseClient
      .from("crm_mensagens")
      .insert({
        conversa_id: conversa.id,
        conteudo: messageContent || (data.media ? "[Mídia]" : ""),
        direcao: "entrada",
        tipo: "whatsapp",
        wa_message_id: waMessageId,
        metadata: data
      });

    if (msgErr) throw msgErr;

    return new Response(JSON.stringify({ status: "success", message_id: waMessageId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Webhook error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
