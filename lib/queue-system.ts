import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Sistema de fila assíncrona para envios
 * Utiliza a tabela `workflow_queue` para processamento background
 */
export async function queueTask(type: 'whatsapp' | 'email', payload: any) {
  const { data, error } = await supabase
    .from('workflow_queue')
    .insert({
      type,
      payload,
      status: 'pending',
      attempts: 0
    });

  if (error) throw error;
  return data;
}

// Nota: Um Worker em Edge Function ou Cron Job deve processar esta fila periodicamente.
