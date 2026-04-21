import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VoiceHealthStatus = "idle" | "checking" | "ok" | "error";

export interface VoiceHealthState {
  status: VoiceHealthStatus;
  /** Mensagem amigável (ex: "Chave de API ausente") quando status = error */
  message: string | null;
  /** Latência da última verificação bem-sucedida, em ms */
  latencyMs: number | null;
  /** Quando foi a última verificação (qualquer resultado) */
  lastCheckedAt: Date | null;
}

interface UseVoiceHealthArgs {
  provider: "browser" | "google" | "elevenlabs";
  voiceId: string | null;
  /** Intervalo entre pings, em ms. Default 60s. */
  intervalMs?: number;
  /** Se false, pausa o polling. */
  enabled?: boolean;
}

const PING_TEXT = ".";

/**
 * Faz ping periódico na edge function `tts` para garantir que o provedor
 * configurado (e a respectiva API key) ainda está respondendo. Para o
 * provider "browser" não há chamada de rede — marcamos como OK direto.
 *
 * Usa um payload mínimo (".") só pra exercitar o caminho de auth/voz sem
 * gerar custo perceptível nas APIs pagas.
 */
export function useVoiceHealth({
  provider,
  voiceId,
  intervalMs = 60_000,
  enabled = true,
}: UseVoiceHealthArgs) {
  const [state, setState] = useState<VoiceHealthState>({
    status: "idle",
    message: null,
    latencyMs: null,
    lastCheckedAt: null,
  });

  // Mantém o request mais recente identificável para descartar respostas obsoletas
  // quando o provedor muda no meio de um ping.
  const reqIdRef = useRef(0);

  const check = useCallback(async () => {
    const id = ++reqIdRef.current;

    if (provider === "browser") {
      setState({
        status: "ok",
        message: null,
        latencyMs: 0,
        lastCheckedAt: new Date(),
      });
      return;
    }

    setState((s) => ({ ...s, status: "checking" }));
    const t0 = performance.now();

    try {
      const { data, error } = await supabase.functions.invoke("tts", {
        body: {
          text: PING_TEXT,
          provider,
          voiceId,
          rate: 1.0,
          pitch: 1.0,
        },
      });

      // Outro ping mais recente já assumiu — descarta este resultado
      if (id !== reqIdRef.current) return;

      if (error) {
        let detail = error.message;
        const ctx = (error as unknown as { context?: Response }).context;
        if (ctx && typeof ctx.json === "function") {
          try {
            const body = await ctx.json();
            if (body?.error) detail = body.error;
          } catch {
            /* corpo não-JSON */
          }
        }
        throw new Error(detail);
      }
      // Provider indisponível com fallback gracioso — não é "erro" do app:
      // a TV continua falando via Web Speech. Reportamos como OK com aviso.
      if (!data?.audioContent) {
        if (data?.fallback === "browser") {
          setState({
            status: "ok",
            message: `${provider} indisponível — usando voz do navegador (${data.reason ?? "fallback"})`,
            latencyMs: Math.round(performance.now() - t0),
            lastCheckedAt: new Date(),
          });
          return;
        }
        throw new Error("Sem áudio retornado");
      }

      setState({
        status: "ok",
        message: null,
        latencyMs: Math.round(performance.now() - t0),
        lastCheckedAt: new Date(),
      });
    } catch (err) {
      if (id !== reqIdRef.current) return;
      const raw = err instanceof Error ? err.message : String(err);
      const isMissingKey = /não configurada|API[_ ]?KEY/i.test(raw);
      setState({
        status: "error",
        message: isMissingKey ? `Chave de API ausente: ${raw}` : raw,
        latencyMs: null,
        lastCheckedAt: new Date(),
      });
    }
  }, [provider, voiceId]);

  useEffect(() => {
    if (!enabled) return;
    void check();
    const t = setInterval(() => void check(), intervalMs);
    return () => clearInterval(t);
  }, [check, enabled, intervalMs]);

  return { ...state, refresh: check };
}
