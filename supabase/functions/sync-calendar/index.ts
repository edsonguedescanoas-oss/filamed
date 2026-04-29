import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyAgendaConsistency(vendedorId: string, externalEvents: any[]) {
  const { data: demos } = await supabase
    .from("demonstracoes")
    .select("*")
    .eq("vendedor_id", vendedorId)
    .neq("status", "cancelada");

  if (!demos) return;

  for (const demo of demos) {
    const demoStart = new Date(demo.data_hora);
    const demoEnd = new Date(demoStart.getTime() + 60 * 60 * 1000);

    const conflict = externalEvents.find((event: any) => {
      const eventStart = new Date(event.start?.dateTime || event.start?.date);
      const eventEnd = new Date(event.end?.dateTime || event.end?.date);
      return demoStart < eventEnd && eventStart < demoEnd;
    });

    if (conflict) {
      await supabase.from("agenda_conflitos").upsert({
        demonstracao_id: demo.id,
        evento_externo_id: conflict.id,
        tipo_calendario: conflict.kind?.includes("calendar") ? "google" : "outlook",
        descricao: `Conflito com evento externo: ${conflict.summary || conflict.subject}`,
        data_conflito: demo.data_hora,
      });
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  try {
    const { vendedor_id, external_events } = await req.json();
    if (vendedor_id && external_events) {
      await verifyAgendaConsistency(vendedor_id, external_events);
    }
    return new Response(
      JSON.stringify({ success: true, message: "Agenda consistency checked." }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
});
