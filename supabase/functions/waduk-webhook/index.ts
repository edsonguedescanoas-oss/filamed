import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

// Extrai os campos relevantes de diferentes formatos de payload do WADUK
function parseIncoming(payload: any): { from?: string; text?: string; messageId?: string; timestamp?: number; isIncoming: boolean } {
  // Formato 1: { event: 'message.received', data: { from, text, id, timestamp } }
  // Formato 2: { type: 'message', message: { from, body, id }, timestamp }
  // Formato 3: { event: 'messages.upsert', data: { key: { remoteJid, fromMe }, message: { conversation } } }
  // Formato 4: payload direto { from, body/text/message }

  const event = payload?.event || payload?.type || payload?.action || '';
  const data = payload?.data || payload?.message || payload;

  // Detectar se é mensagem recebida (não enviada por nós)
  const fromMe = data?.fromMe ?? data?.key?.fromMe ?? payload?.fromMe ?? false;
  const isMessage = /message|msg/i.test(event) || !!data?.from || !!data?.key?.remoteJid;
  const isIncoming = isMessage && !fromMe;

  const from = data?.from || data?.key?.remoteJid || data?.sender || payload?.from || '';
  const text = data?.text || data?.body || data?.message?.conversation || data?.message?.extendedTextMessage?.text || data?.conversation || payload?.text || payload?.body || '';
  const messageId = data?.id || data?.key?.id || data?.messageId || payload?.id;
  const timestamp = data?.timestamp || data?.messageTimestamp || payload?.timestamp || Math.floor(Date.now() / 1000);

  return { from: String(from), text: String(text || ''), messageId, timestamp: Number(timestamp), isIncoming };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Healthcheck / validação de URL pelo painel WADUK
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ status: 'ok', service: 'waduk-webhook' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const rawBody = await req.text();
    console.log('[WADUK-Webhook] Raw body:', rawBody);

    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      console.warn('[WADUK-Webhook] Body não é JSON válido');
    }

    const parsed = parseIncoming(payload);
    console.log('[WADUK-Webhook] Parsed:', JSON.stringify(parsed));

    // Logging do evento para a tabela de logs
    try {
      await supabase.from('waduk_webhook_logs').insert({
        event_type: payload?.event || payload?.type || 'unknown',
        payload: payload,
        status: (parsed.isIncoming && parsed.from && parsed.text) ? 'success' : 'ignored',
        error_message: (parsed.isIncoming && parsed.from && parsed.text) ? null : 'Ignorado: não é mensagem recebida ou faltam campos'
      });
    } catch (logErr) {
      console.error('[WADUK-Webhook] Erro ao gravar log:', logErr);
    }

    if (!parsed.isIncoming || !parsed.from || !parsed.text) {
      console.log('[WADUK-Webhook] Ignorado (não é mensagem recebida ou faltam campos)');
      return new Response(JSON.stringify({ success: true, ignored: true, reason: 'not_incoming_or_missing_fields' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const from = parsed.from.replace(/@.*$/, ''); // remove sufixo tipo @s.whatsapp.net
    const cleanNumber = from.replace(/\D/g, '').replace(/^55/, '');
    const text = parsed.text;
    const timestamp = parsed.timestamp!;

    // 1. Localizar lead
    const { data: lead } = await supabase
      .from('leads')
      .select('id, nome_contato')
      .or(`telefone.ilike.%${cleanNumber}%,telefone.ilike.%${from}%`)
      .maybeSingle()

    if (lead) {
      await supabase.from('interacoes').insert({
        lead_id: lead.id,
        tipo: 'whatsapp',
        conteudo: text,
        usuario_id: '00000000-0000-0000-0000-000000000000',
        data_criacao: new Date(timestamp * 1000).toISOString()
      })
      await supabase.from('leads').update({
        ultimo_contato_em: new Date().toISOString()
      }).eq('id', lead.id)
      console.log(`[WADUK-Webhook] Interação registrada no lead: ${lead.id}`)
    }

    // 2. CRM Conversas
    let { data: contato } = await supabase
      .from('crm_contatos')
      .select('id')
      .or(`telefone.ilike.%${cleanNumber}%,telefone.ilike.%${from}%`)
      .maybeSingle()

    if (!contato) {
      const { data: newContato, error: contatoErr } = await supabase
        .from('crm_contatos')
        .insert({
          nome: lead?.nome_contato || `WhatsApp ${cleanNumber}`,
          telefone: from,
        })
        .select()
        .single()
      if (contatoErr) console.error('[WADUK-Webhook] Erro criando contato:', contatoErr);
      contato = newContato
    }

    if (contato) {
      let { data: conversa } = await supabase
        .from('crm_conversas')
        .select('id')
        .eq('contato_id', contato.id)
        .order('ultima_mensagem_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!conversa) {
        const { data: newConversa, error: convErr } = await supabase
          .from('crm_conversas')
          .insert({ contato_id: contato.id, status: 'aberto' })
          .select()
          .single()
        if (convErr) console.error('[WADUK-Webhook] Erro criando conversa:', convErr);
        conversa = newConversa
      }

      if (conversa) {
        const { error: msgErr } = await supabase.from('crm_mensagens').insert({
          conversa_id: conversa.id,
          conteudo: text,
          direcao: 'entrada',
          tipo: 'whatsapp',
          wa_message_id: parsed.messageId || null,
          created_at: new Date(timestamp * 1000).toISOString()
        })
        if (msgErr) console.error('[WADUK-Webhook] Erro inserindo mensagem:', msgErr);

        await supabase.from('crm_conversas').update({
          ultima_mensagem_preview: text.substring(0, 100),
          ultima_mensagem_at: new Date().toISOString(),
          status: 'aberto',
          updated_at: new Date().toISOString()
        }).eq('id', conversa.id)

        console.log(`[WADUK-Webhook] Mensagem inserida no CRM (contato: ${contato.id}, conversa: ${conversa.id})`)
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('[WADUK-Webhook] Erro fatal:', error.message, error.stack)
    // Retornar 200 mesmo em erro para evitar retries infinitos do WADUK
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
