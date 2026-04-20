// Edge function: gera áudio TTS via Google Cloud TTS ou ElevenLabs.
// Recebe { text, provider, voiceId, rate?, pitch? } e devolve { audioContent: base64, mime, cached }.
// Pública (verify_jwt = false) — usada pelo painel TV anônimo.
//
// Cache: hash SHA-256 de (provider+voiceId+rate+pitch+text) → arquivo no bucket
// `tts-cache`. Antes de chamar a API paga, tenta baixar do cache. Após gerar,
// salva no cache em segundo plano (não bloqueia a resposta).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_TEXT_LENGTH = 500; // chamadas de senha são curtas — evita abuso
const CACHE_BUCKET = "tts-cache";

type Provider = "google" | "elevenlabs";

interface Payload {
  text: string;
  provider: Provider;
  voiceId?: string;
  rate?: number;
  pitch?: number;
}

// --- utilidades --------------------------------------------------------------

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000; // chunk para evitar stack overflow no String.fromCharCode
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function cacheKey(p: Required<Pick<Payload, "provider">> & Payload): string {
  const parts = [
    p.provider,
    p.voiceId ?? "",
    String(p.rate ?? 0.95),
    String(p.pitch ?? 1.0),
    p.text.trim(),
  ].join("|");
  return parts;
}

// --- providers ---------------------------------------------------------------

type TtsResult =
  | { ok: true; audioContent: string; mime: string }
  | { ok: false; unavailable: true; reason: string; status: number };

/**
 * Detecta erros "permanentes" do provider (credencial revogada, API desabilitada,
 * cota zerada). Para esses casos devolvemos fallback ao invés de 500 — assim o
 * cliente cai gracioso para Web Speech API e a TV nunca fica muda.
 */
function isProviderUnavailable(provider: Provider, status: number, body: string): boolean {
  // Google: 403 com SERVICE_DISABLED / API_KEY_SERVICE_BLOCKED / PERMISSION_DENIED
  // ElevenLabs: 401 missing_permissions / invalid_api_key, 403 quota_exceeded
  if (provider === "google") {
    if (status === 403 || status === 401) return true;
    if (status === 429 && /quota/i.test(body)) return true;
  }
  if (provider === "elevenlabs") {
    if (status === 401 || status === 403) return true;
    if (status === 429 && /(quota|exceeded)/i.test(body)) return true;
  }
  return false;
}

async function googleTts(
  text: string,
  voiceId: string | undefined,
  rate: number,
  pitch: number,
): Promise<TtsResult> {
  const apiKey = Deno.env.get("GOOGLE_TTS_API_KEY");
  if (!apiKey) {
    return { ok: false, unavailable: true, reason: "GOOGLE_TTS_API_KEY não configurada", status: 0 };
  }

  const voice = voiceId || "pt-BR-Neural2-C";
  const langCode = voice.split("-").slice(0, 2).join("-") || "pt-BR";

  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: langCode, name: voice },
        audioConfig: {
          audioEncoding: "MP3",
          speakingRate: rate,
          pitch: (pitch - 1) * 10, // 1.0 → 0 semitons; range -20..20
        },
      }),
    },
  );

  if (!res.ok) {
    const errBody = await res.text();
    if (isProviderUnavailable("google", res.status, errBody)) {
      console.warn(`[tts] Google indisponível (${res.status}): ${errBody.slice(0, 800)}`);
      return { ok: false, unavailable: true, reason: `google_${res.status}`, status: res.status };
    }
    throw new Error(`Google TTS falhou: ${res.status} ${errBody}`);
  }
  const data = await res.json();
  return { ok: true, audioContent: data.audioContent as string, mime: "audio/mpeg" };
}

async function elevenLabsTts(
  text: string,
  voiceId: string | undefined,
  rate: number,
): Promise<TtsResult> {
  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!apiKey) {
    return { ok: false, unavailable: true, reason: "ELEVENLABS_API_KEY não configurada", status: 0 };
  }

  const voice = voiceId || "EXAVITQu4vr4xnSDxMaL"; // Sarah por padrão

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.55,
          similarity_boost: 0.8,
          style: 0.3,
          use_speaker_boost: true,
          speed: Math.max(0.7, Math.min(1.2, rate)),
        },
      }),
    },
  );

  if (!res.ok) {
    const errBody = await res.text();
    if (isProviderUnavailable("elevenlabs", res.status, errBody)) {
      console.warn(`[tts] ElevenLabs indisponível (${res.status}): ${errBody.slice(0, 200)}`);
      return { ok: false, unavailable: true, reason: `elevenlabs_${res.status}`, status: res.status };
    }
    throw new Error(`ElevenLabs falhou: ${res.status} ${errBody}`);
  }

  const buffer = await res.arrayBuffer();
  return { ok: true, audioContent: bufferToBase64(buffer), mime: "audio/mpeg" };
}

// --- cache helpers -----------------------------------------------------------

function getStorageClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null; // cache vira no-op se faltar env (não quebra TTS)
  return createClient(url, key);
}

async function tryReadCache(hash: string): Promise<string | null> {
  const client = getStorageClient();
  if (!client) return null;
  const { data, error } = await client.storage.from(CACHE_BUCKET).download(`${hash}.mp3`);
  if (error || !data) return null;
  const buffer = await data.arrayBuffer();
  return bufferToBase64(buffer);
}

async function writeCache(hash: string, base64: string): Promise<void> {
  const client = getStorageClient();
  if (!client) return;
  // base64 → bytes
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  await client.storage
    .from(CACHE_BUCKET)
    .upload(`${hash}.mp3`, bytes, {
      contentType: "audio/mpeg",
      upsert: false, // se outro request gerou primeiro, mantém o existente
    });
}

// --- handler -----------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as Payload;
    const { text, provider, voiceId, rate = 0.95, pitch = 1.0 } = body;

    if (!text?.trim()) {
      return new Response(JSON.stringify({ error: "text é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return new Response(
        JSON.stringify({ error: `text excede ${MAX_TEXT_LENGTH} caracteres` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (provider !== "google" && provider !== "elevenlabs") {
      return new Response(JSON.stringify({ error: "provider inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Cache lookup
    const hash = await sha256Hex(cacheKey({ text, provider, voiceId, rate, pitch }));
    const cached = await tryReadCache(hash);
    if (cached) {
      return new Response(
        JSON.stringify({ audioContent: cached, mime: "audio/mpeg", cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2) Geração
    const result =
      provider === "google"
        ? await googleTts(text, voiceId, rate, pitch)
        : await elevenLabsTts(text, voiceId, rate);

    // 2a) Fallback gracioso: provider indisponível (credencial revogada, API
    // desabilitada, cota zerada). Devolvemos 200 com audioContent: null pra
    // que o cliente caia em Web Speech sem registrar erro 500.
    if (!result.ok) {
      return new Response(
        JSON.stringify({
          audioContent: null,
          fallback: "browser",
          error: "provider_unavailable",
          provider,
          reason: result.reason,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3) Cache write em background — não bloqueia a resposta
    // EdgeRuntime.waitUntil garante que a promise termine mesmo após o response
    const cachePromise = writeCache(hash, result.audioContent).catch((e) =>
      console.error("[tts] cache write falhou:", e),
    );
    // @ts-ignore EdgeRuntime é global no Deno Deploy / Supabase Edge
    if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(cachePromise);

    return new Response(
      JSON.stringify({ audioContent: result.audioContent, mime: result.mime, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[tts] erro:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
