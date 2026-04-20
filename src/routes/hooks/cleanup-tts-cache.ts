// Hook chamado pelo pg_cron diariamente para limpar áudios TTS antigos.
// Critério: arquivos no bucket `tts-cache` com `updated_at` > 30 dias.
//
// Por que `updated_at` e não `last_accessed_at`?
// O Supabase Storage não rastreia leituras. Como a edge function `tts/index.ts`
// usa `upsert: false`, `updated_at` ≈ `created_at` na prática — então estamos
// removendo arquivos *gerados* há 30+ dias. Se a senha cacheada voltar a ser
// chamada, a edge function regenera no próximo request (cache miss → write).
//
// Autenticação: header `Authorization: Bearer <anon key>` + `Lovable-Context: cron`.
// Operações de admin no Storage usam SERVICE_ROLE_KEY (server-only).

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const RETENTION_DAYS = 30;
const BUCKET = "tts-cache";
const PAGE_SIZE = 1000; // máximo aceito pelo storage.list

export const Route = createFileRoute("/hooks/cleanup-tts-cache")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization");
        const token = auth?.replace("Bearer ", "");
        if (!token) {
          return json({ error: "missing authorization" }, 401);
        }

        const url = process.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !serviceKey) {
          return json({ error: "server misconfigured" }, 500);
        }

        const admin = createClient(url, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
        const toDelete: string[] = [];
        let offset = 0;
        let scanned = 0;

        // Pagina o bucket (storage.list é limitado a 1000 por página).
        // Loop para no máximo 100 páginas (100k arquivos) — defesa contra runaway.
        for (let page = 0; page < 100; page++) {
          const { data, error } = await admin.storage.from(BUCKET).list("", {
            limit: PAGE_SIZE,
            offset,
            sortBy: { column: "updated_at", order: "asc" },
          });

          if (error) {
            console.error("[cleanup-tts-cache] list erro:", error);
            return json({ error: error.message }, 500);
          }
          if (!data || data.length === 0) break;

          scanned += data.length;
          for (const obj of data) {
            const ts = obj.updated_at ?? obj.created_at;
            if (ts && new Date(ts).getTime() < cutoff) {
              toDelete.push(obj.name);
            }
          }

          if (data.length < PAGE_SIZE) break;
          offset += PAGE_SIZE;
        }

        // Remove em lotes de 1000 (limite do remove()).
        let deleted = 0;
        for (let i = 0; i < toDelete.length; i += 1000) {
          const batch = toDelete.slice(i, i + 1000);
          const { error } = await admin.storage.from(BUCKET).remove(batch);
          if (error) {
            console.error("[cleanup-tts-cache] remove erro:", error);
            return json({ error: error.message, deleted, scanned }, 500);
          }
          deleted += batch.length;
        }

        console.log(`[cleanup-tts-cache] scanned=${scanned} deleted=${deleted}`);
        return json({ ok: true, scanned, deleted, retention_days: RETENTION_DAYS });
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
