import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Mic, Play, Save, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/app/voz")({
  component: VozConfigPage,
});

type Provider = "browser" | "google" | "elevenlabs";

interface VoiceConfig {
  provider: Provider;
  voice_id: string | null;
  rate: number;
  pitch: number;
}

const ELEVEN_VOICES = [
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah (feminina, multilíngue)" },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura (feminina, jovem)" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda (feminina, calma)" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice (feminina, britânica)" },
  { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica (feminina, expressiva)" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily (feminina, suave)" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George (masculina, britânica)" },
  { id: "nPczCjzI2devNBz1zQrb", name: "Brian (masculina, profunda)" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel (masculina, autoritária)" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam (masculina, jovem)" },
];

const GOOGLE_VOICES = [
  { id: "pt-BR-Neural2-A", name: "pt-BR Neural2-A (feminina)" },
  { id: "pt-BR-Neural2-B", name: "pt-BR Neural2-B (masculina)" },
  { id: "pt-BR-Neural2-C", name: "pt-BR Neural2-C (feminina)" },
  { id: "pt-BR-Wavenet-A", name: "pt-BR Wavenet-A (feminina)" },
  { id: "pt-BR-Wavenet-B", name: "pt-BR Wavenet-B (masculina)" },
  { id: "pt-BR-Wavenet-C", name: "pt-BR Wavenet-C (feminina)" },
  { id: "pt-BR-Standard-A", name: "pt-BR Standard-A (feminina)" },
  { id: "pt-BR-Standard-B", name: "pt-BR Standard-B (masculina)" },
];

const SAMPLE_TEXT = "Paciente João Silva. Senha A zero quatro cinco. Dirija-se ao Consultório dois.";

function VozConfigPage() {
  const { profile, roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const unidadeId = profile?.unidade_id ?? null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [config, setConfig] = useState<VoiceConfig>({
    provider: "browser",
    voice_id: null,
    rate: 0.95,
    pitch: 1.0,
  });
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Lista de vozes do navegador (pt-*)
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const refresh = () => {
      const all = synth.getVoices();
      const pt = all.filter((v) => v.lang?.toLowerCase().startsWith("pt"));
      pt.sort((a, b) => (a.lang === "pt-BR" ? -1 : 1) - (b.lang === "pt-BR" ? -1 : 1));
      setBrowserVoices(pt);
    };
    refresh();
    synth.addEventListener("voiceschanged", refresh);
    return () => synth.removeEventListener("voiceschanged", refresh);
  }, []);

  // Carrega config existente
  useEffect(() => {
    if (!unidadeId) return;
    let mounted = true;
    void (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("unidade_voice_config")
        .select("provider,voice_id,rate,pitch")
        .eq("unidade_id", unidadeId)
        .maybeSingle();
      if (!mounted) return;
      if (error) {
        console.warn("[voz] erro ao carregar:", error.message);
      }
      if (data) {
        setConfig({
          provider: data.provider as Provider,
          voice_id: data.voice_id,
          rate: Number(data.rate),
          pitch: Number(data.pitch),
        });
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [unidadeId]);

  const voiceOptions = useMemo(() => {
    if (config.provider === "browser") {
      // IMPORTANTE: usamos `name` (não voiceURI) porque voiceURI varia entre
      // dispositivos. O painel TV procura por nome para conseguir aplicar a
      // mesma voz mesmo em outro computador/celular.
      return browserVoices.map((v) => ({ id: v.name, name: `${v.name} (${v.lang})` }));
    }
    if (config.provider === "google") return GOOGLE_VOICES;
    if (config.provider === "elevenlabs") return ELEVEN_VOICES;
    return [];
  }, [config.provider, browserVoices]);

  const handleProviderChange = (p: Provider) => {
    setConfig((c) => ({ ...c, provider: p, voice_id: null }));
  };

  const handleSave = async () => {
    if (!unidadeId) return;
    setSaving(true);
    const { error } = await supabase
      .from("unidade_voice_config")
      .upsert(
        {
          unidade_id: unidadeId,
          provider: config.provider,
          voice_id: config.voice_id,
          rate: config.rate,
          pitch: config.pitch,
        },
        { onConflict: "unidade_id" },
      );
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Configuração de voz salva!");
  };

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      if (config.provider === "browser") {
        const synth = window.speechSynthesis;
        synth.cancel();
        const u = new SpeechSynthesisUtterance(SAMPLE_TEXT);
        u.lang = "pt-BR";
        u.rate = config.rate;
        u.pitch = config.pitch;
        if (config.voice_id) {
          const voices = synth.getVoices();
          const v =
            voices.find((x) => x.name === config.voice_id) ??
            voices.find((x) => x.voiceURI === config.voice_id);
          if (v) u.voice = v;
        }
        u.onend = () => setPreviewing(false);
        u.onerror = () => setPreviewing(false);
        synth.speak(u);
        return;
      }

      const { data, error } = await supabase.functions.invoke("tts", {
        body: {
          text: SAMPLE_TEXT,
          provider: config.provider,
          voiceId: config.voice_id,
          rate: config.rate,
          pitch: config.pitch,
        },
      });

      if (error) throw error;
      if (!data?.audioContent) throw new Error("Sem áudio retornado");

      const audio = new Audio(`data:${data.mime ?? "audio/mpeg"};base64,${data.audioContent}`);
      audio.onended = () => setPreviewing(false);
      audio.onerror = () => setPreviewing(false);
      await audio.play();
    } catch (err) {
      console.error("[voz] preview erro:", err);
      toast.error(err instanceof Error ? err.message : "Erro ao reproduzir");
      setPreviewing(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12 text-center">
        <h1 className="font-display text-2xl font-bold">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Apenas administradores podem configurar a voz do painel.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <header>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Volume2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Configuração de voz</h1>
            <p className="text-sm text-muted-foreground">
              Defina qual voz o painel da TV usa para anunciar as senhas.
            </p>
          </div>
        </div>
      </header>

      {/* Provedor */}
      <section className="space-y-3">
        <Label className="text-sm font-semibold">Provedor de voz</Label>
        <div className="grid gap-3 md:grid-cols-3">
          <ProviderCard
            active={config.provider === "browser"}
            onClick={() => handleProviderChange("browser")}
            title="Navegador (grátis)"
            description="Vozes nativas do sistema. Qualidade varia por dispositivo."
            badge="Grátis"
          />
          <ProviderCard
            active={config.provider === "google"}
            onClick={() => handleProviderChange("google")}
            title="Google Cloud TTS"
            description="Vozes Neural2 e Wavenet em pt-BR. Requer chave da API."
            badge="API key"
          />
          <ProviderCard
            active={config.provider === "elevenlabs"}
            onClick={() => handleProviderChange("elevenlabs")}
            title="ElevenLabs"
            description="Vozes ultra realistas multilíngues. Requer chave da API."
            badge="API key"
          />
        </div>
      </section>

      {/* Voz */}
      <section className="space-y-3">
        <Label htmlFor="voice" className="text-sm font-semibold">
          Voz
        </Label>
        {voiceOptions.length === 0 && config.provider === "browser" ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma voz pt-BR detectada neste navegador. Tente acessar o painel TV no Chrome ou em
            outro dispositivo.
          </p>
        ) : (
          <select
            id="voice"
            value={config.voice_id ?? ""}
            onChange={(e) => setConfig((c) => ({ ...c, voice_id: e.target.value || null }))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Padrão do provedor</option>
            {voiceOptions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        )}
      </section>

      {/* Rate & pitch */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="rate" className="text-sm font-semibold">
            Velocidade ({config.rate.toFixed(2)}x)
          </Label>
          <Input
            id="rate"
            type="range"
            min={0.7}
            max={1.3}
            step={0.05}
            value={config.rate}
            onChange={(e) => setConfig((c) => ({ ...c, rate: Number(e.target.value) }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pitch" className="text-sm font-semibold">
            Tom ({config.pitch.toFixed(2)})
            {config.provider === "elevenlabs" && (
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                (não aplicável no ElevenLabs)
              </span>
            )}
          </Label>
          <Input
            id="pitch"
            type="range"
            min={0.5}
            max={1.5}
            step={0.05}
            value={config.pitch}
            onChange={(e) => setConfig((c) => ({ ...c, pitch: Number(e.target.value) }))}
          />
        </div>
      </section>

      {/* Ações */}
      <section className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar configuração
        </Button>
        <Button
          variant="outline"
          onClick={handlePreview}
          disabled={previewing}
          className="gap-2"
        >
          {previewing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Pré-ouvir
        </Button>
        <p className="text-xs text-muted-foreground">
          Frase de teste: "{SAMPLE_TEXT}"
        </p>
      </section>

      {(config.provider === "google" || config.provider === "elevenlabs") && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <div className="flex items-start gap-2">
            <Mic className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold">Chave de API necessária</p>
              <p className="text-muted-foreground">
                Para usar {config.provider === "google" ? "Google TTS" : "ElevenLabs"}, é preciso
                cadastrar a chave{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  {config.provider === "google" ? "GOOGLE_TTS_API_KEY" : "ELEVENLABS_API_KEY"}
                </code>{" "}
                nos secrets do backend. Solicite à equipe se ainda não estiver configurada.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProviderCard({
  active,
  onClick,
  title,
  description,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  description: string;
  badge: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border p-4 transition-all ${
        active
          ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
          : "border-border bg-card hover:border-primary/40"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-sm">{title}</h3>
        <span
          className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
            active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          {badge}
        </span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{description}</p>
    </button>
  );
}
