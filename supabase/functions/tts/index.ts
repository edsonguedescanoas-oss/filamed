// Edge function: gera áudio TTS via Google Cloud TTS ou ElevenLabs.
// Recebe { text, provider, voiceId, rate?, pitch? } e devolve { audioContent: base64, mime }.
// Pública (verify_jwt = false) — usada pelo painel TV anônimo.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Provider = "google" | "elevenlabs";

interface Payload {
  text: string;
  provider: Provider;
  voiceId?: string;
  rate?: number;
  pitch?: number;
}

async function googleTts(text: string, voiceId: string | undefined, rate: number, pitch: number) {
  const apiKey = Deno.env.get("GOOGLE_TTS_API_KEY");
  if (!apiKey) throw new Error("GOOGLE_TTS_API_KEY não configurada");

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
    const err = await res.text();
    throw new Error(`Google TTS falhou: ${res.status} ${err}`);
  }
  const data = await res.json();
  return { audioContent: data.audioContent as string, mime: "audio/mpeg" };
}

async function elevenLabsTts(text: string, voiceId: string | undefined, rate: number) {
  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY não configurada");

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
    const err = await res.text();
    throw new Error(`ElevenLabs falhou: ${res.status} ${err}`);
  }

  const buffer = await res.arrayBuffer();
  // @ts-ignore Deno global
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer.slice(0, 0)))) || "";
  // Conversão segura (sem stack overflow) usando Uint8Array em chunks
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return { audioContent: btoa(binary) || base64, mime: "audio/mpeg" };
}

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

    let result;
    if (provider === "google") {
      result = await googleTts(text, voiceId, rate, pitch);
    } else if (provider === "elevenlabs") {
      result = await elevenLabsTts(text, voiceId, rate);
    } else {
      return new Response(JSON.stringify({ error: "provider inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
