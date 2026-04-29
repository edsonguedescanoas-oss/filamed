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

      // 2. Localizar lead pelo número de telefone
      const { data: lead } = await supabase
        .from('leads')
        .select('id')
        .or(`telefone.ilike.%${cleanNumber}%,telefone.ilike.%${from}%`)
        .single()

      if (lead) {
        // 3. Registrar interação de WhatsApp
        await supabase.from('interacoes').insert({
          lead_id: lead.id,
          tipo: 'whatsapp',
          conteudo: text,
          usuario_id: '00000000-0000-0000-0000-000000000000', // ID de sistema para interações automáticas
          data_criacao: new Date(timestamp * 1000).toISOString()
        })

        // 4. Atualizar data de último contato
        await supabase.from('leads').update({
          ultimo_contato_em: new Date().toISOString()
        }).eq('id', lead.id)

        // 5. Notificar via workflow (seria integrado à engine server-side)
        console.log(`[WADUK-Webhook] Workflow disparado para lead: ${lead.id}`)
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
