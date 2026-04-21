import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Mic,
  Play,
  RefreshCw,
  Save,
  Volume2,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRecurso } from "@/hooks/use-recurso";
import { useVoiceHealth } from "@/hooks/use-voice-health";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  TEMPLATE_OPTIONS,
  montarTextoChamada,
  type TemplateChamada,
} from "@/lib/voice-template";

export const Route = createFileRoute("/_app/app/voz")({
  component: VozConfigPage,
});

type Provider = "browser" | "google" | "elevenlabs";

interface VoiceConfig {
  provider: Provider;
  voice_id: string | null;
  rate: number;
  pitch: number;
  template_chamada: TemplateChamada;
}

interface VoiceConfigMeta {
  provider: Provider;
  voice_id: string | null;
  updated_at: string;
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

function providerLabel(p: Provider): string {
  if (p === "google") return "Google Cloud TTS";
  if (p === "elevenlabs") return "ElevenLabs";
  return "Navegador (grátis)";
}

function voiceDisplayName(meta: VoiceConfigMeta, browserVoices: SpeechSynthesisVoice[]): string {
  const { provider, voice_id } = meta;
  if (!voice_id) return "Voz padrão do provedor";
  if (provider === "elevenlabs") {
    return ELEVEN_VOICES.find((v) => v.id === voice_id)?.name ?? voice_id;
  }
  if (provider === "google") {
    return GOOGLE_VOICES.find((v) => v.id === voice_id)?.name ?? voice_id;
  }
  // browser: voice_id é o `name` da voz
  const v = browserVoices.find((b) => b.name === voice_id) ?? browserVoices.find((b) => b.voiceURI === voice_id);
  return v ? `${v.name} (${v.lang})` : voice_id;
}

function VozConfigPage() {
  const { profile, roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const unidadeId = profile?.unidade_id ?? null;
  const { liberado: vozPremiumLiberada, planoNome } = useRecurso("voz_premium");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [config, setConfig] = useState<VoiceConfig>({
    provider: "browser",
    voice_id: null,
    rate: 0.95,
    pitch: 1.0,
    template_chamada: "paciente_senha_fila",
  });
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  // Snapshot do que está realmente salvo no banco (o que a TV está usando agora).
  const [activeMeta, setActiveMeta] = useState<VoiceConfigMeta | null>(null);

  // Indicador de saúde: ping periódico na edge function tts pra detectar
  // chave expirada / quota / provider fora do ar antes da TV "ficar muda".
  // Usa o que está SALVO (activeMeta), não o que está sendo editado.
  const health = useVoiceHealth({
    provider: activeMeta?.provider ?? "browser",
    voiceId: activeMeta?.voice_id ?? null,
    intervalMs: 60_000,
    enabled: !!activeMeta,
  });

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
        .select("provider,voice_id,rate,pitch,template_chamada,updated_at")
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
          template_chamada:
            (data.template_chamada as TemplateChamada) ?? "paciente_senha_fila",
        });
        setActiveMeta({
          provider: data.provider as Provider,
          voice_id: data.voice_id,
          updated_at: data.updated_at,
        });
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [unidadeId]);

  // Realtime: se outro admin alterar, atualizamos o "em uso pela TV"
  useEffect(() => {
    if (!unidadeId) return;
    const ch = supabase
      .channel(`unidade:${unidadeId}:voz-cfg-admin`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "unidade_voice_config",
          filter: `unidade_id=eq.${unidadeId}`,
        },
        (payload) => {
          const row = payload.new as
            | { provider?: string; voice_id?: string | null; updated_at?: string }
            | null;
          if (!row?.updated_at) return;
          setActiveMeta({
            provider: (row.provider as Provider) ?? "browser",
            voice_id: row.voice_id ?? null,
            updated_at: row.updated_at,
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
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
    if ((p === "google" || p === "elevenlabs") && !vozPremiumLiberada) {
      toast.error("Voz premium não está no seu plano", {
        description: planoNome
          ? `Plano atual: ${planoNome}. Faça upgrade para liberar Google TTS e ElevenLabs.`
          : "Faça upgrade para liberar Google TTS e ElevenLabs.",
        action: {
          label: "Ver planos",
          onClick: () => {
            window.location.href = "/precos";
          },
        },
      });
      return;
    }
    setConfig((c) => ({ ...c, provider: p, voice_id: null }));
  };

  const handleSave = async () => {
    if (!unidadeId) return;
    setSaving(true);

    // Para provedores externos, valida com chamada real à edge function antes
    // de salvar — evita gravar uma configuração que vai quebrar a TV
    // silenciosamente por falta de API key ou voz inválida.
    if (config.provider === "google" || config.provider === "elevenlabs") {
      const toastId = toast.loading(
        `Validando ${providerLabel(config.provider)}…`,
      );
      try {
        const { data, error } = await supabase.functions.invoke("tts", {
          body: {
            text: "Teste de voz.",
            provider: config.provider,
            voiceId: config.voice_id,
            rate: config.rate,
            pitch: config.pitch,
          },
        });

        // Edge function devolve { error: "..." } com status 4xx/5xx — o SDK
        // entrega como FunctionsHttpError; tentamos extrair a mensagem real.
        if (error) {
          let detail = error.message;
          // O SDK expõe a Response original em error.context
          const ctx = (error as unknown as { context?: Response }).context;
          if (ctx && typeof ctx.json === "function") {
            try {
              const body = await ctx.json();
              if (body?.error) detail = body.error;
            } catch {
              /* corpo não-JSON, mantém mensagem original */
            }
          }
          throw new Error(detail);
        }
        if (!data?.audioContent) {
          // Provider indisponível com fallback gracioso — não bloqueia o save,
          // mas avisa o admin que a TV vai usar voz do navegador.
          if (data?.fallback === "browser") {
            toast.dismiss(toastId);
            toast.warning(
              `${providerLabel(config.provider)} indisponível (${data.reason ?? "erro"}). ` +
                `Configuração salva — a TV vai usar voz do navegador como fallback.`,
              { duration: 8000 },
            );
          } else {
            throw new Error("A edge function não retornou áudio.");
          }
        } else {
          toast.dismiss(toastId);
        }
      } catch (err) {
        toast.dismiss(toastId);
        setSaving(false);
        const msg = err instanceof Error ? err.message : String(err);
        const isMissingKey = /não configurada|API[_ ]?KEY/i.test(msg);
        toast.error(
          isMissingKey
            ? `Chave de API ausente: ${msg}. Configure o secret antes de salvar.`
            : `Falha ao validar ${providerLabel(config.provider)}: ${msg}`,
          { duration: 8000 },
        );
        return;
      }
    }

    const { error } = await supabase
      .from("unidade_voice_config")
      .upsert(
        {
          unidade_id: unidadeId,
          provider: config.provider,
          voice_id: config.voice_id,
          rate: config.rate,
          pitch: config.pitch,
          template_chamada: config.template_chamada,
        },
        { onConflict: "unidade_id" },
      );
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    setActiveMeta({
      provider: config.provider,
      voice_id: config.voice_id,
      updated_at: new Date().toISOString(),
    });
    toast.success("Configuração de voz salva e validada!");
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
      if (!data?.audioContent) {
        // Fallback gracioso — provider indisponível, demonstra com Web Speech
        if (data?.fallback === "browser") {
          toast.warning(
            `${providerLabel(config.provider)} indisponível. Tocando preview com voz do navegador.`,
            { duration: 5000 },
          );
          const synth = window.speechSynthesis;
          synth.cancel();
          const u = new SpeechSynthesisUtterance(SAMPLE_TEXT);
          u.lang = "pt-BR";
          u.rate = config.rate;
          u.pitch = config.pitch;
          u.onend = () => setPreviewing(false);
          u.onerror = () => setPreviewing(false);
          synth.speak(u);
          return;
        }
        throw new Error("Sem áudio retornado");
      }

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
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
      <div className="space-y-8">
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

      {/* Em uso pela TV (lê do banco) */}
      <section className="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary/15">
              <Volume2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                Em uso pela TV agora
              </div>
              {activeMeta ? (
                <>
                  <div className="mt-1 font-semibold text-sm">
                    {voiceDisplayName(activeMeta, browserVoices)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Provedor:{" "}
                    <span className="font-medium text-foreground">
                      {providerLabel(activeMeta.provider)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="mt-1 text-sm text-muted-foreground">
                  Nenhuma configuração salva — a TV está usando a voz padrão do navegador.
                </div>
              )}
            </div>
          </div>
          {activeMeta && (
            <div className="text-right">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Última alteração
              </div>
              <div className="text-sm font-mono tabular-nums">
                {new Date(activeMeta.updated_at).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Aviso: voz salva (browser) não existe no navegador atual */}
      {activeMeta?.provider === "browser" &&
        activeMeta.voice_id &&
        browserVoices.length > 0 &&
        !browserVoices.some(
          (v) => v.name === activeMeta.voice_id || v.voiceURI === activeMeta.voice_id,
        ) && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
            <div className="flex items-start gap-2">
              <Mic className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
              <div className="space-y-1">
                <p className="font-semibold text-destructive">
                  A voz configurada não existe neste dispositivo
                </p>
                <p className="text-muted-foreground">
                  A voz salva no banco é{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">
                    {activeMeta.voice_id}
                  </code>
                  , mas ela não está instalada no navegador atual. Vozes do
                  navegador são <strong>locais ao dispositivo</strong> — uma TV
                  rodando em outro computador/Android/Smart TV provavelmente também
                  não terá. Reconfigure escolhendo uma voz da lista abaixo (no
                  próprio dispositivo da TV) ou troque para o provedor{" "}
                  <strong>Google Cloud TTS</strong> / <strong>ElevenLabs</strong>,
                  que funcionam em qualquer dispositivo.
                </p>
              </div>
            </div>
          </div>
        )}

      {/* Saúde do provedor (ping periódico) */}
      <HealthCard
        provider={activeMeta?.provider ?? "browser"}
        status={health.status}
        message={health.message}
        latencyMs={health.latencyMs}
        lastCheckedAt={health.lastCheckedAt}
        onRefresh={() => void health.refresh()}
        hasConfig={!!activeMeta}
      />


      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Label className="text-sm font-semibold">Provedor de voz</Label>
          {!vozPremiumLiberada && (
            <Link
              to="/precos"
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10"
            >
              <Lock className="h-3 w-3" />
              Voz premium não inclusa — fazer upgrade
            </Link>
          )}
        </div>
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
            badge={vozPremiumLiberada ? "API key" : "Premium"}
            locked={!vozPremiumLiberada}
          />
          <ProviderCard
            active={config.provider === "elevenlabs"}
            onClick={() => handleProviderChange("elevenlabs")}
            title="ElevenLabs"
            description="Vozes ultra realistas multilíngues. Requer chave da API."
            badge={vozPremiumLiberada ? "API key" : "Premium"}
            locked={!vozPremiumLiberada}
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

      {/* Template da chamada */}
      <section className="space-y-3">
        <div>
          <Label className="text-sm font-semibold">Texto da chamada</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Escolha como a TV vai anunciar cada senha. O destino é o texto livre
            digitado pelo operador na hora da chamada (ex.: "Consultório 2",
            "Guichê 01").
          </p>
        </div>
        <div className="grid gap-2">
          {TEMPLATE_OPTIONS.map((opt) => {
            const ativo = config.template_chamada === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  setConfig((c) => ({ ...c, template_chamada: opt.id }))
                }
                className={`text-left rounded-xl border p-4 transition-all ${
                  ativo
                    ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                        ativo
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/40"
                      }`}
                    >
                      {ativo && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                      )}
                    </span>
                    <h3 className="font-semibold text-sm">{opt.label}</h3>
                  </div>
                </div>
                <p className="mt-1.5 ml-6 text-xs text-muted-foreground">
                  {opt.description}
                </p>
                <div className="mt-2 ml-6 rounded-md bg-muted/60 px-3 py-2 text-xs italic text-foreground/80">
                  🔊 “{opt.exemplo}”
                </div>
              </button>
            );
          })}
        </div>
      </section>


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
    </div>
  );
}


function ProviderCard({
  active,
  onClick,
  title,
  description,
  badge,
  locked = false,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  description: string;
  badge: string;
  locked?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border p-4 transition-all relative ${
        active
          ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
          : locked
            ? "border-dashed border-border bg-muted/30 hover:border-primary/40"
            : "border-border bg-card hover:border-primary/40"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-sm flex items-center gap-1.5">
          {locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
          {title}
        </h3>
        <span
          className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
            active
              ? "bg-primary/20 text-primary"
              : locked
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {badge}
        </span>
      </div>
      <p className={`mt-2 text-xs leading-relaxed ${locked ? "text-muted-foreground/70" : "text-muted-foreground"}`}>
        {description}
      </p>
    </button>
  );
}

function HealthCard({
  provider,
  status,
  message,
  latencyMs,
  lastCheckedAt,
  onRefresh,
  hasConfig,
}: {
  provider: Provider;
  status: "idle" | "checking" | "ok" | "error";
  message: string | null;
  latencyMs: number | null;
  lastCheckedAt: Date | null;
  onRefresh: () => void;
  hasConfig: boolean;
}) {
  const isBrowser = provider === "browser";

  const tone =
    status === "error"
      ? {
          border: "border-destructive/40",
          bg: "bg-destructive/5",
          dot: "bg-destructive",
          icon: <XCircle className="h-4 w-4 text-destructive" />,
          label: "Provedor com falha",
          labelColor: "text-destructive",
        }
      : status === "ok"
        ? {
            border: "border-emerald-500/30",
            bg: "bg-emerald-500/5",
            dot: "bg-emerald-500",
            icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
            label: isBrowser ? "Voz local pronta" : "Provedor saudável",
            labelColor: "text-emerald-600 dark:text-emerald-400",
          }
        : status === "checking"
          ? {
              border: "border-border",
              bg: "bg-muted/30",
              dot: "bg-muted-foreground animate-pulse",
              icon: <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />,
              label: "Verificando provedor…",
              labelColor: "text-muted-foreground",
            }
          : {
              border: "border-border",
              bg: "bg-muted/20",
              dot: "bg-muted-foreground",
              icon: <Volume2 className="h-4 w-4 text-muted-foreground" />,
              label: "Aguardando primeira verificação",
              labelColor: "text-muted-foreground",
            };

  return (
    <section className={`rounded-xl border ${tone.border} ${tone.bg} p-4`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-background/60">
            {tone.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`inline-block h-2 w-2 rounded-full ${tone.dot}`} />
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Saúde do provedor
              </div>
            </div>
            <div className={`mt-1 font-semibold text-sm ${tone.labelColor}`}>
              {tone.label}
            </div>
            {!hasConfig ? (
              <div className="text-xs text-muted-foreground mt-0.5">
                Salve uma configuração para iniciar o monitoramento.
              </div>
            ) : status === "error" && message ? (
              <div className="text-xs text-destructive/90 mt-0.5 max-w-md">
                {message}
              </div>
            ) : status === "ok" && !isBrowser && latencyMs != null ? (
              <div className="text-xs text-muted-foreground mt-0.5">
                Resposta em <span className="font-mono tabular-nums">{latencyMs}ms</span> · ping a cada 60s
              </div>
            ) : status === "ok" && isBrowser ? (
              <div className="text-xs text-muted-foreground mt-0.5">
                Síntese roda no navegador — sem dependência de rede.
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onRefresh}
            disabled={status === "checking"}
            className="gap-1.5 h-7 text-xs"
          >
            <RefreshCw
              className={`h-3 w-3 ${status === "checking" ? "animate-spin" : ""}`}
            />
            Verificar agora
          </Button>
          {lastCheckedAt && (
            <div className="text-[10px] text-muted-foreground font-mono tabular-nums">
              {lastCheckedAt.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

