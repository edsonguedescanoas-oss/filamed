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

    const { table, record, type } = await req.json()
    console.log(`[Workflow-Webhook] Alteração em ${table}: ${type}`)

    // Se um lead foi criado ou alterado, disparar engine
    if (table === 'leads') {
      let trigger = ''
      if (type === 'INSERT') trigger = 'lead_criado'
      else if (type === 'UPDATE') trigger = 'lead_estagio_alterado'

      if (trigger) {
        // Chamar o WorkflowEngine (aqui seria via lógica interna ou chamando outro endpoint)
        // Como o WorkflowEngine está no frontend, idealmente teríamos uma lógica server-side.
        // Simulando a execução direta:
        console.log(`Disparando workflows para trigger: ${trigger} no lead ${record.id}`)
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
