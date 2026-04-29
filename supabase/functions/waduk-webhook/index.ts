import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()
    console.log('[WADUK-Webhook] Payload recebido:', JSON.stringify(payload))

    // 1. Identificar se é uma mensagem recebida
    if (payload.event === 'message.received') {
      const { from, text, timestamp } = payload.data
      const cleanNumber = from.replace(/\D/g, '').replace(/^55/, '') // Remove DDI 55 para busca

      // 2. Localizar lead pelo número de telefone (Fluxo de Automação)
      const { data: lead } = await supabase
        .from('leads')
        .select('id, nome_contato')
        .or(`telefone.ilike.%${cleanNumber}%,telefone.ilike.%${from}%`)
        .maybeSingle()

      if (lead) {
        // Registrar interação de WhatsApp no histórico do Lead
        await supabase.from('interacoes').insert({
          lead_id: lead.id,
          tipo: 'whatsapp',
          conteudo: text,
          usuario_id: '00000000-0000-0000-0000-000000000000', 
          data_criacao: new Date(timestamp * 1000).toISOString()
        })

        // Atualizar data de último contato no Lead
        await supabase.from('leads').update({
          ultimo_contato_em: new Date().toISOString()
        }).eq('id', lead.id)

        console.log(`[WADUK-Webhook] Mensagem registrada para lead: ${lead.id}`)
      }

      // 3. Fluxo de Atendimento (CRM Conversas)
      // Localizar contato no CRM pelo número
      let { data: contato } = await supabase
        .from('crm_contatos')
        .select('id')
        .or(`telefone.ilike.%${cleanNumber}%,telefone.ilike.%${from}%`)
        .maybeSingle()

      // Se não existe contato no CRM, criar um
      if (!contato && lead) {
        const { data: newContato } = await supabase
          .from('crm_contatos')
          .insert({
            nome: lead.nome_contato || `Lead ${cleanNumber}`,
            telefone: from,
            lead_id: lead.id
          })
          .select()
          .single()
        contato = newContato
      } else if (!contato) {
        const { data: newContato } = await supabase
          .from('crm_contatos')
          .insert({
            nome: `WhatsApp ${cleanNumber}`,
            telefone: from
          })
          .select()
          .single()
        contato = newContato
      }

      if (contato) {
        // Localizar ou criar conversa ativa
        let { data: conversa } = await supabase
          .from('crm_conversas')
          .select('id')
          .eq('contato_id', contato.id)
          .order('ultima_mensagem_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!conversa) {
          const { data: newConversa } = await supabase
            .from('crm_conversas')
            .insert({
              contato_id: contato.id,
              status: 'aberto'
            })
            .select()
            .single()
          conversa = newConversa
        }

        // Inserir mensagem
        await supabase.from('crm_mensagens').insert({
          conversa_id: conversa.id,
          conteudo: text,
          direcao: 'entrada',
          tipo: 'whatsapp',
          wa_message_id: payload.data.id || null,
          created_at: new Date(timestamp * 1000).toISOString()
        })

        // Atualizar conversa
        await supabase.from('crm_conversas').update({
          ultima_mensagem_preview: text.substring(0, 100),
          ultima_mensagem_at: new Date().toISOString(),
          status: 'aberto', // Garante que a conversa volta para aberto se estava resolvida
          updated_at: new Date().toISOString()
        }).eq('id', conversa.id)

        console.log(`[WADUK-Webhook] Mensagem inserida no CRM para contato: ${contato.id}`)
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('[WADUK-Webhook] Erro:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
