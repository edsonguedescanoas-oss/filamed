import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Endpoint público de healthcheck.
 *
 * Valida em paralelo:
 *  - banco de dados (SELECT trivial em `unidades`)
 *  - edge function `tts` (ping com payload mínimo no provider browser → 400 esperado, mas confirma rota viva)
 *
 * Resposta JSON:
 *   {
 *     status: "ok" | "degraded" | "down",
 *     uptimeSeconds: number,
 *     timestamp: string,
 *     checks: { db: CheckResult, tts: CheckResult }
 *   }
 *
 * Use em monitoramento externo (UptimeRobot, BetterStack, etc.).
 * Códigos HTTP:
 *   200 → ok
 *   207 → degraded (algum check falhou mas o serviço ainda responde)
 *   503 → down (DB inacessível)
 */

type CheckStatus = "ok" | "fail";

interface CheckResult {
  status: CheckStatus;
  latencyMs: number;
  message?: string;
}

const startedAt = Date.now();

async function checkDatabase(): Promise<CheckResult> {
  const t0 = performance.now();
  try {
    const { error } = await supabaseAdmin
      .from("unidades")
      .select("id", { count: "exact", head: true })
      .limit(1);
    if (error) throw error;
    return { status: "ok", latencyMs: Math.round(performance.now() - t0) };
  } catch (err) {
    return {
      status: "fail",
      latencyMs: Math.round(performance.now() - t0),
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

async function checkTts(): Promise<CheckResult> {
  const t0 = performance.now();
  try {
    const url = `${process.env.SUPABASE_URL}/functions/v1/tts`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? ""}`,
      },
      body: JSON.stringify({ text: "ping", provider: "invalid" }),
    });
    // Esperamos 400 (provider inválido) — significa que a função está viva.
    // Qualquer 5xx ou erro de rede conta como falha.
    if (res.status >= 500) {
      return {
        status: "fail",
        latencyMs: Math.round(performance.now() - t0),
        message: `TTS retornou ${res.status}`,
      };
    }
    return { status: "ok", latencyMs: Math.round(performance.now() - t0) };
  } catch (err) {
    return {
      status: "fail",
      latencyMs: Math.round(performance.now() - t0),
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

export const Route = createFileRoute("/hooks/healthcheck")({
  server: {
    handlers: {
      GET: async () => {
        const [db, tts] = await Promise.all([checkDatabase(), checkTts()]);

        const dbDown = db.status === "fail";
        const anyFail = dbDown || tts.status === "fail";

        const overall: "ok" | "degraded" | "down" = dbDown
          ? "down"
          : anyFail
            ? "degraded"
            : "ok";

        const httpStatus = dbDown ? 503 : anyFail ? 207 : 200;

        return new Response(
          JSON.stringify(
            {
              status: overall,
              uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
              timestamp: new Date().toISOString(),
              checks: { db, tts },
            },
            null,
            2,
          ),
          {
            status: httpStatus,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );
      },
    },
  },
});
