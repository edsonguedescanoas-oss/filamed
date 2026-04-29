import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Verifica consistência entre agendamentos internos e eventos externos
 */
export async function verifyAgendaConsistency(vendedorId: string, externalEvents: any[]) {
  // 1. Buscar demonstrações ativas do vendedor
  const { data: demos } = await supabase
    .from('demonstracoes')
    .select('*')
    .eq('vendedor_id', vendedorId)
    .neq('status', 'cancelada');

  if (!demos) return;

  for (const demo of demos) {
    const demoStart = new Date(demo.data_hora);
    const demoEnd = new Date(demoStart.getTime() + 60 * 60 * 1000); // 1h duração

    // 2. Cruzar com eventos externos
    const conflict = externalEvents.find(event => {
      const eventStart = new Date(event.start.dateTime || event.start.date);
      const eventEnd = new Date(event.end.dateTime || event.end.date);
      
      return (demoStart < eventEnd && eventStart < demoEnd);
    });

    if (conflict) {
      // 3. Registrar conflito se encontrado
      await supabase.from('agenda_conflitos').upsert({
        demonstracao_id: demo.id,
        evento_externo_id: conflict.id,
        tipo_calendario: conflict.kind?.includes('calendar') ? 'google' : 'outlook',
        descricao: `Conflito com evento externo: ${conflict.summary || conflict.subject}`,
        data_conflito: demo.data_hora
      });
    }
  }
}
