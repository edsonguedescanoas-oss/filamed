import { createFileRoute, useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Clock, Loader2, Maximize, Megaphone, Mic, Minimize, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QrCode } from "@/components/qr-code";
import { TvCarrossel } from "@/components/tv-carrossel";
import { montarTextoChamada, type TemplateChamada } from "@/lib/voice-template";

type Unidade = { id: string; nome: string; slug: string };
type Fila = { id: string; nome: string; prefixo_senha: string; cor: string | null; ordem: number };
type SenhaPrioridade = "normal" | "preferencial" | "urgente";
type SenhaStatus = "aguardando" | "chamada" | "em_atendimento" | "finalizada" | "ausente" | "cancelada";
type Senha = {
  id: string;
  codigo: string;
  fila_id: string;
  /** Não vem do anon; só populado se a TV rodar autenticada (futuro). */
  paciente_id?: string | null;
  status: SenhaStatus;
  prioridade: SenhaPrioridade;
  /** Não exposto ao anon. Mantido para compat com rotas autenticadas. */
  token_publico?: string;
  updated_at: string;
  created_at: string;
};
type Chamada = {
  id: string;
  senha_id: string;
  destino: string;
  created_at: string;
};

/* ── Helpers de fala ───────────────────────────────────── */
function primeiroEUltimoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length <= 2) return nome.trim();
  return `${partes[0]} ${partes[partes.length - 1]}`;
}

/**
 * Soletra letras do código (A045 → "A, zero quatro cinco") para o TTS pronunciar
 * de forma clara em ambientes barulhentos. Letras isoladas, números agrupados.
 */
function soletrarCodigo(codigo: string): string {
  const trimmed = codigo.trim();
  // Separa letras iniciais dos números: "A045" → "A " + "045"
  const match = trimmed.match(/^([A-Za-z]*)(\d*)(.*)$/);
  if (!match) return trimmed;
  const letras = match[1].toUpperCase().split("").join(" ");
  const numeros = match[2]
    .split("")
    .map((d) => ({ "0": "zero", "1": "um", "2": "dois", "3": "três", "4": "quatro", "5": "cinco", "6": "seis", "7": "sete", "8": "oito", "9": "nove" })[d] ?? d)
    .join(" ");
  const resto = match[3];
  return [letras, numeros, resto].filter(Boolean).join(" ").trim();
}

/**
 * Adiciona preposição apropriada se o destino não começar com uma.
 * "Consultório 2" → "ao Consultório 2"; "à Sala 3" → mantém.
 */
function formatarDestino(destino: string): string {
  const d = destino.trim();
  if (/^(ao|à|aos|às|para|no|na|nos|nas)\s/i.test(d)) return d;
  // Heurística: começa com vogal feminina comum → "à", senão "ao"
  if (/^[Ss]ala/.test(d)) return `à ${d}`;
  return `ao ${d}`;
}

type TvSearch = { kiosk?: boolean };

export const Route = createFileRoute("/tv/$slug")({
  validateSearch: (search: Record<string, unknown>): TvSearch => ({
    kiosk:
      search.kiosk === true ||
      search.kiosk === 1 ||
      search.kiosk === "1" ||
      search.kiosk === "true",
  }),
  head: ({ params }) => ({
    meta: [
      { title: `Painel — ${params.slug} — FilaMed` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TvPage,
});

function TvPage() {
  const { slug } = useParams({ from: "/tv/$slug" });
  const { kiosk } = useSearch({ from: "/tv/$slug" });
  const [unidade, setUnidade] = useState<Unidade | null>(null);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [senhas, setSenhas] = useState<Senha[]>([]);
  const [chamadas, setChamadas] = useState<Chamada[]>([]);
  const [now, setNow] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  // O painel TV nunca deve ficar mudo. Tentamos manter o som sempre ativo;
  // se o browser bloquear (autoplay policy), mostramos overlay pedindo 1 clique.
  const [soundOn, setSoundOn] = useState(true);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{
    text: string;
    voice: string;
    status: "falando" | "ok" | "erro" | "vazio";
    at: Date;
    error?: string;
  } | null>(null);
  
  // Cache reativo de nomes de paciente por paciente_id (alimenta a UI)
  const [pacienteNomes, setPacienteNomes] = useState<Record<string, string>>({});

  // Configuração de voz vinda do banco (configurada no admin)
  type VoiceProvider = "browser" | "google" | "elevenlabs";
  type VoiceCfg = {
    provider: VoiceProvider;
    voice_id: string | null;
    rate: number;
    pitch: number;
    template_chamada: TemplateChamada;
  };
  const [voiceCfg, setVoiceCfg] = useState<VoiceCfg>({
    provider: "browser",
    voice_id: null,
    rate: 0.95,
    pitch: 1,
    template_chamada: "paciente_senha_fila",
  });

  // Vozes pt-* disponíveis no navegador (apenas para fallback/preview local)
  const VOICE_STORAGE_KEY = "filamed.tv.voiceURI";
  const [ptVoices, setPtVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(VOICE_STORAGE_KEY);
  });

  // Carrega lista de vozes (algumas plataformas só populam após `voiceschanged`)
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const refresh = () => {
      const all = synth.getVoices();
      const pt = all.filter((v) => v.lang?.toLowerCase().startsWith("pt"));
      pt.sort((a, b) => {
        const aBR = a.lang === "pt-BR" ? 0 : 1;
        const bBR = b.lang === "pt-BR" ? 0 : 1;
        if (aBR !== bBR) return aBR - bBR;
        return a.name.localeCompare(b.name);
      });
      setPtVoices(pt);
    };
    refresh();
    synth.addEventListener("voiceschanged", refresh);
    return () => synth.removeEventListener("voiceschanged", refresh);
  }, []);

  const handleSelectVoice = (uri: string) => {
    setSelectedVoiceURI(uri || null);
    if (typeof window !== "undefined") {
      if (uri) localStorage.setItem(VOICE_STORAGE_KEY, uri);
      else localStorage.removeItem(VOICE_STORAGE_KEY);
    }
    // Pré-visualização curta com a voz selecionada
    if (uri && typeof window !== "undefined" && "speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance("Voz selecionada");
      u.lang = "pt-BR";
      const v = window.speechSynthesis.getVoices().find((x) => x.voiceURI === uri);
      if (v) u.voice = v;
      window.speechSynthesis.speak(u);
    }
  };

  // Carregamento inicial
  useEffect(() => {
    let mounted = true;
    void (async () => {
      // Busca a unidade pelo slug via RPC pública (não expõe cnpj/endereço/telefone)
      const { data: uniRows, error: uniErr } = await supabase
        .rpc("get_unidade_publica_by_slug", { _slug: slug });
      const uni = (uniRows ?? [])[0] ?? null;
      if (!mounted) return;
      if (uniErr || !uni) {
        setError("Unidade não encontrada");
        return;
      }
      setUnidade(uni as Unidade);

      const [filasRes, senhasRes, chamadasRes] = await Promise.all([
        supabase
          .from("filas")
          .select("id,nome,prefixo_senha,cor,ordem")
          .eq("unidade_id", uni.id)
          .eq("ativa", true)
          .order("ordem"),
        // RPC pública: senhas ativas SEM paciente_id e SEM token_publico
        supabase.rpc("get_senhas_ativas", { _unidade_id: uni.id }),
        // RPC pública: apenas chamadas dos últimos 60s (basta para piscar a TV)
        supabase.rpc("get_chamadas_recentes", { _unidade_id: uni.id }),
      ]);
      if (!mounted) return;
      setFilas((filasRes.data ?? []) as Fila[]);
      setSenhas(((senhasRes.data ?? []) as Senha[]).map((s) => ({ ...s, paciente_id: s.paciente_id ?? null })));
      setChamadas((chamadasRes.data ?? []) as Chamada[]);

      // Carrega config de voz da unidade (se existir)
      const { data: cfg } = await supabase
        .from("unidade_voice_config")
        .select("provider,voice_id,rate,pitch,template_chamada")
        .eq("unidade_id", uni.id)
        .maybeSingle();
      if (mounted && cfg) {
        setVoiceCfg({
          provider: (cfg.provider as VoiceProvider) ?? "browser",
          voice_id: cfg.voice_id,
          rate: Number(cfg.rate) || 0.95,
          pitch: Number(cfg.pitch) || 1,
          template_chamada:
            (cfg.template_chamada as TemplateChamada) ?? "paciente_senha_fila",
        });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [slug]);

  // Realtime: assina mudanças na config de voz da unidade
  useEffect(() => {
    if (!unidade) return;
    const ch = supabase
      .channel(`tv:${unidade.id}:voice-cfg`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "unidade_voice_config", filter: `unidade_id=eq.${unidade.id}` },
        (payload) => {
          const row = payload.new as {
            provider?: string;
            voice_id?: string | null;
            rate?: number;
            pitch?: number;
            template_chamada?: string;
          } | null;
          if (!row) return;
          setVoiceCfg({
            provider: (row.provider as VoiceProvider) ?? "browser",
            voice_id: row.voice_id ?? null,
            rate: Number(row.rate) || 0.95,
            pitch: Number(row.pitch) || 1,
            template_chamada:
              (row.template_chamada as TemplateChamada) ?? "paciente_senha_fila",
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [unidade]);

  // Realtime — escuta senhas e chamadas da unidade
  useEffect(() => {
    if (!unidade) return;
    const channel = supabase
      .channel(`tv:${unidade.id}:senhas-chamadas`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "senhas", filter: `unidade_id=eq.${unidade.id}` },
        (payload) => {
          setSenhas((prev) => {
            if (payload.eventType === "INSERT") {
              return [...prev, payload.new as Senha].filter((s) =>
                ["aguardando", "chamada", "em_atendimento"].includes(s.status),
              );
            }
            if (payload.eventType === "UPDATE") {
              const updated = payload.new as Senha;
              // Se a senha não está mais com status "chamada", cancela rechamadas pendentes
              if (updated.status !== "chamada") {
                cancelRechamadas(updated.id);
              }
              const next = prev.map((s) => (s.id === updated.id ? updated : s));
              return next.filter((s) =>
                ["aguardando", "chamada", "em_atendimento"].includes(s.status),
              );
            }
            if (payload.eventType === "DELETE") {
              const old = payload.old as { id: string };
              cancelRechamadas(old.id);
              return prev.filter((s) => s.id !== old.id);
            }
            return prev;
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chamadas", filter: `unidade_id=eq.${unidade.id}` },
        (payload) => {
          const nova = payload.new as Chamada;
          console.info("[TV] 📣 chamada recebida via realtime:", nova, "soundOn:", soundOnRef.current);
          setChamadas((prev) => [nova, ...prev].slice(0, 10));
          if (soundOnRef.current) {
            playDing();
            void announceChamada(nova);
            agendarRechamadas(nova);
          } else {
            console.warn("[TV] som desativado — clique em 'Ativar som' no painel");
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
      // Limpa todos os timers pendentes ao desmontar
      cancelAllRechamadas();
    };
  }, [unidade]);

  // Relógio
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Fullscreen — controle e auto-ativação no modo kiosk
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const requestFullscreen = async () => {
    if (typeof document === "undefined") return;
    try {
      const el = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
      };
      if (document.fullscreenElement) return;
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    } catch {
      /* navegador pode bloquear sem gesto — silencioso */
    }
  };
  const exitFullscreen = async () => {
    if (typeof document === "undefined") return;
    try {
      const doc = document as Document & { webkitExitFullscreen?: () => Promise<void> };
      if (!document.fullscreenElement) return;
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
    } catch {
      /* ignora */
    }
  };
  const toggleFullscreen = () => {
    if (isFullscreen) void exitFullscreen();
    else void requestFullscreen();
  };

  // Em modo kiosk, tenta entrar em fullscreen na primeira interação do usuário
  useEffect(() => {
    if (!kiosk || typeof window === "undefined") return;
    // Não chamamos requestFullscreen sem gesto (gera warning no console).
    // Aguardamos a primeira interação do usuário (clique/toque/tecla).
    const onInteract = () => {
      void requestFullscreen();
      window.removeEventListener("click", onInteract);
      window.removeEventListener("touchstart", onInteract);
      window.removeEventListener("keydown", onInteract);
    };
    window.addEventListener("click", onInteract);
    window.addEventListener("touchstart", onInteract);
    window.addEventListener("keydown", onInteract);
    return () => {
      window.removeEventListener("click", onInteract);
      window.removeEventListener("touchstart", onInteract);
      window.removeEventListener("keydown", onInteract);
    };
  }, [kiosk]);

  // Som
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundOnRef = useRef(false);
  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  // Elemento <audio> reutilizado para tocar TTS de Google/ElevenLabs.
  // Chrome/Safari/iOS exigem que play() seja consequência de um gesto do
  // usuário. Criamos uma única instância e a "aquecemos" no primeiro clique
  // (com um MP3 silencioso) pra que chamadas .play() subsequentes em handlers
  // de realtime não sejam bloqueadas pela autoplay policy.
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteAudioPrimedRef = useRef(false);
  // ~0.1s de MP3 silencioso (44.1kHz mono, ID3 v2 + frame MPEG válido)
  const SILENT_MP3 =
    "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQwAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAACcQCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAAAAAOTGF2YzU4LjEzAAAAAAAAAAAAAAAA//sQxAADwAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVV";
  const ensureRemoteAudio = (): HTMLAudioElement | null => {
    if (typeof window === "undefined") return null;
    if (!remoteAudioRef.current) {
      const el = new Audio();
      el.preload = "auto";
      remoteAudioRef.current = el;
    }
    return remoteAudioRef.current;
  };
  const primeRemoteAudio = () => {
    const el = ensureRemoteAudio();
    if (!el || remoteAudioPrimedRef.current) return;
    try {
      el.src = SILENT_MP3;
      el.muted = true;
      el.volume = 0;
      const p = el.play();
      if (p && typeof p.then === "function") {
        void p
          .then(() => {
            remoteAudioPrimedRef.current = true;
            el.pause();
            el.muted = false;
            el.volume = 1;
          })
          .catch(() => {
            /* navegador ainda não liberou — tentaremos no próximo gesto */
          });
      }
    } catch {
      /* ignora */
    }
  };
  const playDing = () => {
    try {
      let ctx = audioCtxRef.current;
      if (!ctx) {
        const Ctor =
          window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        ctx = new Ctor();
        audioCtxRef.current = ctx;
      }
      const t0 = ctx.currentTime;
      const tones = [880, 1320];
      tones.forEach((freq, i) => {
        const osc = ctx!.createOscillator();
        const gain = ctx!.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t0 + i * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.25, t0 + i * 0.18 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.18 + 0.35);
        osc.connect(gain).connect(ctx!.destination);
        osc.start(t0 + i * 0.18);
        osc.stop(t0 + i * 0.18 + 0.4);
      });
    } catch {
      /* ignora */
    }
  };
  const handleEnableSound = () => {
    setSoundOn(true);
    setAudioBlocked(false);
    // gesto do usuário desbloqueia AudioContext
    playDing();
    // Também "aquece" a Web Speech API com uma fala silenciosa
    primeSpeech();
    // E pré-aquece o elemento <audio> que será usado por Google/ElevenLabs:
    // tocamos um MP3 silencioso pra que o navegador associe o gesto a esse
    // elemento e libere autoplay nas próximas .play() (Chrome/Safari/iOS).
    primeRemoteAudio();
  };

  // Tenta destravar áudio automaticamente. Se o browser bloquear (autoplay policy),
  // sinaliza audioBlocked=true para mostrar overlay pedindo 1 clique do operador.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    const tryUnlock = async () => {
      try {
        const Ctor =
          window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        let ctx = audioCtxRef.current;
        if (!ctx) {
          ctx = new Ctor();
          audioCtxRef.current = ctx;
        }
        if (ctx.state === "suspended") {
          await ctx.resume();
        }
        if (cancelled) return;
        if (ctx.state !== "running") {
          setAudioBlocked(true);
        } else {
          setAudioBlocked(false);
          primeSpeech();
        }
      } catch {
        if (!cancelled) setAudioBlocked(true);
      }
    };
    void tryUnlock();
    // Qualquer interação do usuário destrava: clique, toque, tecla
    const onInteract = () => {
      handleEnableSound();
      window.removeEventListener("click", onInteract);
      window.removeEventListener("touchstart", onInteract);
      window.removeEventListener("keydown", onInteract);
    };
    window.addEventListener("click", onInteract);
    window.addEventListener("touchstart", onInteract);
    window.addEventListener("keydown", onInteract);
    return () => {
      cancelled = true;
      window.removeEventListener("click", onInteract);
      window.removeEventListener("touchstart", onInteract);
      window.removeEventListener("keydown", onInteract);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Voz: Web Speech API ────────────────────────────────
  const pacienteCacheRef = useRef<Map<string, string>>(new Map());
  const senhasMapRef = useRef(new Map<string, Senha>());
  useEffect(() => {
    senhasMapRef.current = new Map(senhas.map((s) => [s.id, s]));
  }, [senhas]);

  // Mantém voiceCfg em ref para acessar dentro de callbacks de realtime sem closure stale
  const voiceCfgRef = useRef(voiceCfg);
  useEffect(() => {
    voiceCfgRef.current = voiceCfg;
  }, [voiceCfg]);

  // Reproduz áudio TTS retornado pela edge function (Google ou ElevenLabs)
  const playRemoteTts = async (text: string, cfg: VoiceCfg) => {
    try {
      const { data, error } = await supabase.functions.invoke("tts", {
        body: {
          text,
          provider: cfg.provider,
          voiceId: cfg.voice_id,
          rate: cfg.rate,
          pitch: cfg.pitch,
        },
      });
      if (error) throw error;

      // Provider indisponível (ex: API key revogada/cota zerada). A edge function
      // devolve 200 com audioContent: null e fallback: "browser" — caímos no
      // Web Speech ao invés de ficar muda. Ver supabase/functions/tts/index.ts.
      if (!data?.audioContent) {
        if (data?.fallback === "browser") {
          console.warn(`[TV] ${cfg.provider} indisponível (${data.reason ?? "?"}), usando Web Speech`);
          const utterance = createPreparedUtterance();
          if (utterance) {
            utterance.text = text;
            speakUtterance(utterance);
          }
          return;
        }
        throw new Error("Sem áudio retornado");
      }

      setDebugInfo({
        text,
        voice: `${cfg.provider}: ${cfg.voice_id ?? "padrão"}`,
        status: "falando",
        at: new Date(),
      });

      // Reusa o elemento <audio> que foi destravado no gesto inicial
      // (handleEnableSound → primeRemoteAudio). Criar um new Audio() aqui
      // dentro de um handler de realtime quase sempre é bloqueado pelo
      // navegador como "autoplay sem gesto".
      const audio = ensureRemoteAudio();
      if (!audio) throw new Error("Elemento <audio> indisponível");
      audio.src = `data:${data.mime ?? "audio/mpeg"};base64,${data.audioContent}`;
      audio.onended = () => {
        setDebugInfo((prev) => (prev && prev.text === text ? { ...prev, status: "ok", at: new Date() } : prev));
      };
      audio.onerror = () => {
        const mediaErr = audio.error;
        const codeMap: Record<number, string> = {
          1: "MEDIA_ERR_ABORTED",
          2: "MEDIA_ERR_NETWORK",
          3: "MEDIA_ERR_DECODE",
          4: "MEDIA_ERR_SRC_NOT_SUPPORTED",
        };
        const reason = mediaErr ? (codeMap[mediaErr.code] ?? `code ${mediaErr.code}`) : "desconhecido";
        console.error("[TV] <audio> onerror:", reason, mediaErr?.message);
        setDebugInfo({
          text,
          voice: `${cfg.provider}: ${cfg.voice_id ?? "padrão"}`,
          status: "erro",
          at: new Date(),
          error: `Falha ao reproduzir áudio (${reason})`,
        });
      };
      try {
        await audio.play();
      } catch (playErr) {
        const name = playErr instanceof Error ? playErr.name : "Error";
        const msg = playErr instanceof Error ? playErr.message : String(playErr);
        console.error("[TV] audio.play() rejeitado:", name, msg);
        if (name === "NotAllowedError") {
          // Autoplay bloqueado — pede o clique do operador novamente
          setAudioBlocked(true);
        }
        setDebugInfo({
          text,
          voice: `${cfg.provider}: ${cfg.voice_id ?? "padrão"}`,
          status: "erro",
          at: new Date(),
          error: `play() falhou: ${name} — ${msg}`,
        });
      }
    } catch (err) {
      console.error("[TV] erro TTS remoto:", err);
      setDebugInfo({
        text,
        voice: `${cfg.provider}: ${cfg.voice_id ?? "padrão"}`,
        status: "erro",
        at: new Date(),
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };


  const primeSpeech = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      u.lang = "pt-BR";
      window.speechSynthesis.speak(u);
    } catch {
      /* ignora */
    }
  };

  const createPreparedUtterance = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;

    const synth = window.speechSynthesis;
    const cfg = voiceCfgRef.current;
    const utterance = new SpeechSynthesisUtterance("");
    utterance.lang = "pt-BR";
    utterance.rate = cfg.rate || 0.95;
    utterance.pitch = cfg.pitch || 1;
    utterance.volume = 1;

    const voices = synth.getVoices();
    // Prioridade: voz salva no banco (provider=browser) > localStorage legado > default pt-BR
    // O voice_id salvo é o `name` da voz (portátil entre dispositivos); fallback p/ voiceURI legado.
    const cfgVoice = cfg.provider === "browser" && cfg.voice_id
      ? voices.find((v) => v.name === cfg.voice_id) ??
        voices.find((v) => v.voiceURI === cfg.voice_id)
      : null;

    // Diagnóstico: se admin salvou uma voz específica e ela NÃO existe neste
    // dispositivo (caso comum quando admin configura no Chrome desktop e a TV
    // roda em Android/Firefox/Safari sem essa voz instalada), avisamos no debug
    // — sem isso, a TV ficava muda silenciosamente.
    if (cfg.provider === "browser" && cfg.voice_id && !cfgVoice) {
      const available = voices.map((v) => v.name).join(", ") || "(nenhuma)";
      console.warn(
        `[TV] voz configurada "${cfg.voice_id}" não existe neste dispositivo. ` +
          `Vozes disponíveis: ${available}. Usando fallback.`,
      );
      setDebugInfo({
        text: "(config)",
        voice: cfg.voice_id,
        status: "erro",
        at: new Date(),
        error: `Voz "${cfg.voice_id}" não está instalada neste dispositivo. Reconfigure em /app/voz aqui mesmo, ou escolha provider Google/ElevenLabs.`,
      });
    }

    const saved = !cfgVoice && selectedVoiceURI ? voices.find((v) => v.voiceURI === selectedVoiceURI) : null;
    const ptVoice =
      cfgVoice ??
      saved ??
      voices.find((v) => v.lang === "pt-BR") ??
      voices.find((v) => v.lang?.toLowerCase().startsWith("pt")) ??
      // Último recurso: qualquer voz disponível, mesmo que em outro idioma —
      // melhor falar com sotaque do que ficar mudo.
      voices[0];

    if (ptVoice) utterance.voice = ptVoice;

    return utterance;
  };


  const speakUtterance = (utterance: SpeechSynthesisUtterance) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      console.warn("[TV] speechSynthesis indisponível");
      return;
    }
    try {
      const synth = window.speechSynthesis;
      if (synth.paused) synth.resume();
      synth.cancel();

      utterance.onstart = () => console.info("[TV] 🔊 falando:", utterance.text);
      utterance.onstart = () => {
        console.info("[TV] 🔊 falando:", utterance.text);
        setDebugInfo({
          text: utterance.text,
          voice: utterance.voice?.name ?? "padrão do sistema",
          status: "falando",
          at: new Date(),
        });
      };
      utterance.onerror = (e) => {
        console.error("[TV] erro TTS:", e.error, utterance.text);
        setDebugInfo({
          text: utterance.text,
          voice: utterance.voice?.name ?? "padrão do sistema",
          status: "erro",
          at: new Date(),
          error: String(e.error ?? "desconhecido"),
        });
      };
      utterance.onend = () => {
        console.info("[TV] ✓ fim da fala");
        setDebugInfo((prev) =>
          prev && prev.text === utterance.text ? { ...prev, status: "ok", at: new Date() } : prev,
        );
      };
      console.info("[TV] speak() →", { text: utterance.text, voice: utterance.voice?.name, voicesCount: synth.getVoices().length });
      synth.speak(utterance);

      setTimeout(() => {
        if (synth.speaking && synth.paused) synth.resume();
      }, 100);
    } catch (e) {
      console.error("[TV] exceção em speak():", e);
    }
  };

  const resolveDadosDaSenha = async (senhaId: string) => {
    const senhaAtual = senhasMapRef.current.get(senhaId);
    if (senhaAtual?.codigo && senhaAtual.paciente_id) return senhaAtual;

    // Anon não pode mais ler senhas direto. Buscamos só os campos públicos via RPC.
    const { data, error } = await supabase
      .rpc("get_senhas_ativas", { _unidade_id: unidade?.id ?? "" });
    const found = ((data ?? []) as Senha[]).find((s) => s.id === senhaId) ?? null;

    if (error || !found) {
      console.warn("[TV] não foi possível resolver dados da senha:", senhaId, error?.message);
      return senhaAtual ?? null;
    }

    const resolved: Senha = { ...found, paciente_id: found.paciente_id ?? null };
    senhasMapRef.current.set(resolved.id, resolved);
    return resolved;
  };

  const resolveNomePaciente = async (senha: Senha | null) => {
    if (!senha?.paciente_id) return null;

    const cached = pacienteCacheRef.current.get(senha.paciente_id);
    if (cached) return cached;

    const { data, error } = await supabase
      .from("pacientes")
      .select("nome_completo")
      .eq("id", senha.paciente_id)
      .maybeSingle();

    if (error) {
      console.warn("[TV] não foi possível carregar paciente da senha:", senha.id, error.message);
      return null;
    }

    const raw = (data as { nome_completo?: string } | null)?.nome_completo?.trim();
    if (!raw) return null;

    const nome = primeiroEUltimoNome(raw);
    pacienteCacheRef.current.set(senha.paciente_id, nome);
    setPacienteNomes((prev) =>
      prev[senha.paciente_id!] === nome ? prev : { ...prev, [senha.paciente_id!]: nome },
    );
    return nome;
  };

  const announceChamada = async (chamada: Chamada) => {
    const cfg = voiceCfgRef.current;
    const usingBrowser = cfg.provider === "browser";
    if (usingBrowser && (typeof window === "undefined" || !("speechSynthesis" in window))) return;

    const utterance = usingBrowser ? createPreparedUtterance() : null;
    if (usingBrowser && !utterance) return;

    const senha = await resolveDadosDaSenha(chamada.senha_id);

    // Pequeno delay para o "ding" terminar antes da fala
    await new Promise((r) => setTimeout(r, 700));

    const nome = await resolveNomePaciente(senha);

    const codigo = senha?.codigo ?? "";
    const codigoFalado = codigo ? soletrarCodigo(codigo) : "";
    // Regra de chamada: o admin escolhe o template em /app/voz. O nome da fila
    // é resolvido via fila_id; o destino é o texto livre digitado pelo operador
    // (ex.: "Consultório 2") e só aparece nos templates que incluem "destino".
    const fila = senha?.fila_id ? filas.find((f) => f.id === senha.fila_id) ?? null : null;
    const nomeFila = fila?.nome ?? null;
    const texto = montarTextoChamada({
      template: cfg.template_chamada,
      nome,
      codigoFalado,
      nomeFila,
      destino: chamada.destino ?? null,
      formatarDestino,
    });
    console.info("[TV] texto final da chamada:", texto || "<vazio>", "provider:", cfg.provider);
    if (!texto) {
      setDebugInfo({
        text: "<vazio>",
        voice: usingBrowser ? (utterance?.voice?.name ?? "padrão do sistema") : cfg.provider,
        status: "vazio",
        at: new Date(),
        error: "Texto montado ficou vazio",
      });
      return;
    }

    if (usingBrowser && utterance) {
      utterance.text = texto;
      speakUtterance(utterance);
    } else {
      await playRemoteTts(texto, cfg);
    }
  };

  // ── Rechamada automática ───────────────────────────────
  // Para cada chamada, mantém os timers de até 2 repetições.
  // Se o status da senha sair de "chamada", cancela.
  const rechamadasRef = useRef<Map<string, ReturnType<typeof setTimeout>[]>>(new Map());

  const cancelRechamadas = (senhaId: string) => {
    const timers = rechamadasRef.current.get(senhaId);
    if (!timers) return;
    for (const t of timers) clearTimeout(t);
    rechamadasRef.current.delete(senhaId);
  };

  const cancelAllRechamadas = () => {
    for (const timers of rechamadasRef.current.values()) {
      for (const t of timers) clearTimeout(t);
    }
    rechamadasRef.current.clear();
  };

  const agendarRechamadas = (chamada: Chamada) => {
    // Limpa qualquer agendamento anterior dessa senha (caso seja re-chamada manual)
    cancelRechamadas(chamada.senha_id);

    const tentar = async () => {
      // Só repete se a senha ainda estiver com status "chamada" e o som estiver ligado
      if (!soundOnRef.current) return;
      const atual = senhasMapRef.current.get(chamada.senha_id);
      if (!atual || atual.status !== "chamada") {
        cancelRechamadas(chamada.senha_id);
        return;
      }
      playDing();
      await announceChamada(chamada);
    };

    const t1 = setTimeout(() => void tentar(), 30_000);
    const t2 = setTimeout(() => void tentar(), 60_000);
    rechamadasRef.current.set(chamada.senha_id, [t1, t2]);
  };


  // Derivações
  const filasMap = useMemo(() => new Map(filas.map((f) => [f.id, f])), [filas]);
  const senhasMap = useMemo(() => new Map(senhas.map((s) => [s.id, s])), [senhas]);

  // Senha em destaque = última chamada ainda ativa
  const destaque = useMemo(() => {
    for (const c of chamadas) {
      const s = senhasMap.get(c.senha_id);
      if (s && (s.status === "chamada" || s.status === "em_atendimento")) {
        return { senha: s, chamada: c };
      }
    }
    return null;
  }, [chamadas, senhasMap]);

  const ultimasChamadas = useMemo(() => {
    const seen = new Set<string>();
    const list: Array<{ chamada: Chamada; senha: Senha }> = [];
    for (const c of chamadas) {
      if (seen.has(c.senha_id)) continue;
      const s = senhasMap.get(c.senha_id);
      if (!s) continue;
      seen.add(c.senha_id);
      list.push({ chamada: c, senha: s });
      if (list.length >= 5) break;
    }
    return list;
  }, [chamadas, senhasMap]);

  // Pré-carrega nomes dos pacientes das senhas visíveis (destaque + últimas chamadas)
  useEffect(() => {
    const idsParaBuscar = new Set<string>();
    if (destaque?.senha.paciente_id && !pacienteNomes[destaque.senha.paciente_id]) {
      idsParaBuscar.add(destaque.senha.paciente_id);
    }
    for (const { senha } of ultimasChamadas) {
      if (senha.paciente_id && !pacienteNomes[senha.paciente_id]) {
        idsParaBuscar.add(senha.paciente_id);
      }
    }
    if (idsParaBuscar.size === 0) return;

    let mounted = true;
    void (async () => {
      const { data, error } = await supabase
        .from("pacientes")
        .select("id,nome_completo")
        .in("id", Array.from(idsParaBuscar));
      if (!mounted || error || !data) return;
      setPacienteNomes((prev) => {
        const next = { ...prev };
        for (const p of data as { id: string; nome_completo: string }[]) {
          const nome = primeiroEUltimoNome(p.nome_completo);
          next[p.id] = nome;
          pacienteCacheRef.current.set(p.id, nome);
        }
        return next;
      });
    })();
    return () => {
      mounted = false;
    };
  }, [destaque, ultimasChamadas, pacienteNomes]);

  const aguardandoPorFila = useMemo(() => {
    const groups = new Map<string, Senha[]>();
    for (const s of senhas) {
      if (s.status !== "aguardando") continue;
      const arr = groups.get(s.fila_id) ?? [];
      arr.push(s);
      groups.set(s.fila_id, arr);
    }
    // ordena: urgente > preferencial > normal, depois created_at
    const prioRank: Record<SenhaPrioridade, number> = { urgente: 0, preferencial: 1, normal: 2 };
    for (const arr of groups.values()) {
      arr.sort((a, b) => {
        const r = prioRank[a.prioridade] - prioRank[b.prioridade];
        if (r !== 0) return r;
        return a.created_at.localeCompare(b.created_at);
      });
    }
    return groups;
  }, [senhas]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <Megaphone className="mx-auto mb-4 h-12 w-12 text-slate-500" />
          <h1 className="font-display text-2xl font-bold">{error}</h1>
          <p className="mt-2 text-sm text-slate-400">Verifique o endereço do painel.</p>
        </div>
      </div>
    );
  }

  if (!unidade) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-primary/40">
      {/* Header — oculto em modo kiosk */}
      {!kiosk && (
      <header className="border-b border-white/10 bg-slate-900/50 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <Activity className="h-6 w-6 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">
                FilaMed Painel
              </p>
              <h1 className="font-display text-xl font-bold">{unidade.nome}</h1>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 text-slate-300">
              <Clock className="h-5 w-5" />
              <div className="leading-tight text-right">
                <div className="font-mono text-xl font-bold tabular-nums">
                  {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </div>
                <div className="text-xs text-slate-400 capitalize">
                  {now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                </div>
              </div>
            </div>
            {/* Seletor de voz pt-BR (só aparece se houver vozes disponíveis) */}
            {ptVoices.length > 0 && (
              <label
                className="hidden md:flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium hover:bg-white/10 transition-colors cursor-pointer"
                title="Voz usada para anunciar as chamadas"
              >
                <Mic className="h-4 w-4 text-slate-400" />
                <select
                  value={selectedVoiceURI ?? ""}
                  onChange={(e) => handleSelectVoice(e.target.value)}
                  className="bg-transparent border-0 outline-none text-sm font-medium text-slate-200 max-w-[180px] truncate cursor-pointer focus:ring-0"
                >
                  <option value="" className="bg-slate-900">
                    Voz automática
                  </option>
                  {ptVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI} className="bg-slate-900">
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium ${
                audioBlocked
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                  : "border-white/10 bg-white/5 text-slate-200"
              }`}
              title={audioBlocked ? "Áudio bloqueado pelo navegador — clique na tela" : "Som sempre ativo"}
            >
              {audioBlocked ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4 text-primary" />
              )}
              <span className="hidden sm:inline">
                {audioBlocked ? "Toque a tela" : "Som ativo"}
              </span>
            </div>
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/10 transition-colors"
              title={isFullscreen ? "Sair de tela cheia" : "Entrar em tela cheia"}
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              <span className="hidden lg:inline">{isFullscreen ? "Sair" : "Tela cheia"}</span>
            </button>
          </div>
        </div>
      </header>
      )}

      {/* Conteúdo */}
      <main
        className={
          kiosk
            ? "mx-auto max-w-[1600px] grid gap-6 px-6 py-6 lg:grid-cols-[1.5fr_1fr]"
            : "mx-auto max-w-[1600px] grid gap-6 px-8 py-8 lg:grid-cols-[1.5fr_1fr]"
        }
      >
        {/* Coluna esquerda: destaque + últimas chamadas */}
        <section className="space-y-6">
          <div
            className={`relative overflow-hidden rounded-3xl border p-10 ${
              destaque
                ? "border-primary/40 bg-gradient-to-br from-primary/20 via-slate-900 to-slate-900 shadow-glow animate-pulse-soft"
                : "border-white/10 bg-slate-900"
            }`}
          >
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/80">
              Senha chamada
            </div>
            {destaque ? (
              <>
                <div className="mt-4 flex items-end gap-4 flex-wrap">
                  <div className="font-display text-[10rem] font-black leading-none tracking-tight tabular-nums">
                    {destaque.senha.codigo}
                  </div>
                  <PrioridadeTag prioridade={destaque.senha.prioridade} big />
                </div>
                {destaque.senha.paciente_id && pacienteNomes[destaque.senha.paciente_id] && (
                  <div className="mt-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                      Paciente
                    </div>
                    <div className="mt-1 font-display text-3xl font-bold text-white">
                      {pacienteNomes[destaque.senha.paciente_id]}
                    </div>
                  </div>
                )}
                <div className="mt-6 flex items-end justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-sm text-slate-400">Dirija-se a</div>
                    <div className="font-display text-4xl font-bold text-primary">
                      {destaque.chamada.destino}
                    </div>
                  </div>
                  <div className="text-right text-sm text-slate-400">
                    Fila:{" "}
                    <span className="text-white font-medium">
                      {filasMap.get(destaque.senha.fila_id)?.nome ?? "—"}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-10 flex flex-col items-center justify-center py-16 text-center text-slate-400">
                <Megaphone className="h-16 w-16 mb-4 opacity-50" />
                <p className="font-display text-2xl">Aguardando próxima chamada…</p>
              </div>
            )}

            {/* QR Code discreto no canto: paciente acompanha pelo celular */}
            {destaque?.senha.token_publico && (
              <div className="absolute bottom-5 right-5 flex flex-col items-center opacity-90 transition-opacity hover:opacity-100">
                <QrCode
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/s/${destaque.senha.token_publico}`}
                  size={kiosk ? 110 : 96}
                />
                <div className="mt-1 text-center text-[10px] font-medium uppercase tracking-wider text-slate-300">
                  Acompanhe no celular
                </div>
              </div>
            )}
          </div>

          {/* Últimas chamadas */}
          <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 mb-4">
              Últimas chamadas
            </h2>
            {ultimasChamadas.length === 0 ? (
              <p className="text-slate-500 text-sm">Nenhuma chamada ainda.</p>
            ) : (
              <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {ultimasChamadas.map(({ chamada, senha }) => {
                  const fila = filas.find((f) => f.id === senha.fila_id);
                  const cor = fila?.cor ?? "#3B82F6";
                  return (
                    <li
                      key={chamada.id}
                      className="overflow-hidden rounded-2xl border border-white/10 bg-slate-800/60 text-center"
                    >
                      <div className="h-1 w-full" style={{ backgroundColor: cor }} />
                      <div className="p-4">
                        <div className="font-display text-3xl font-bold tabular-nums">
                          {senha.codigo}
                        </div>
                        {senha.paciente_id && pacienteNomes[senha.paciente_id] && (
                          <div className="mt-1 truncate text-xs font-medium text-slate-200">
                            {pacienteNomes[senha.paciente_id]}
                          </div>
                        )}
                        {fila?.nome && (
                          <div
                            className="mt-1 truncate text-[11px] font-semibold uppercase tracking-wider"
                            style={{ color: cor }}
                            title={fila.nome}
                          >
                            {fila.nome}
                          </div>
                        )}
                        <div className="mt-1 truncate text-xs text-slate-400">
                          {chamada.destino}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Carrossel de mídia (sinalização digital) — pausa enquanto há chamada destacada */}
          {unidade && (
            <TvCarrossel
              unidadeId={unidade.id}
              paused={Boolean(destaque)}
            />
          )}
        </section>

        {/* Coluna direita: aguardando por fila */}
        <aside className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 px-1">
            Aguardando atendimento
          </h2>
          {filas.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-6 text-slate-500 text-sm">
              Nenhuma fila configurada.
            </div>
          ) : (
            filas.map((f) => {
              const arr = aguardandoPorFila.get(f.id) ?? [];
              return (
                <div key={f.id} className="rounded-2xl border border-white/10 bg-slate-900 overflow-hidden">
                  <div
                    className="flex items-center justify-between px-5 py-3 border-b border-white/10"
                    style={{
                      background: `linear-gradient(90deg, ${f.cor ?? "#3B82F6"}33, transparent)`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: f.cor ?? "#3B82F6" }}
                      />
                      <span className="font-display font-semibold">{f.nome}</span>
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      {arr.length} na fila
                    </span>
                  </div>
                  <div className="p-4">
                    {arr.length === 0 ? (
                      <p className="text-xs text-slate-500">Vazia</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {arr.slice(0, 12).map((s) => (
                          <span
                            key={s.id}
                            className={`px-3 py-1.5 rounded-lg font-mono font-semibold text-sm tabular-nums border ${
                              s.prioridade === "urgente"
                                ? "border-red-500/40 bg-red-500/10 text-red-200"
                                : s.prioridade === "preferencial"
                                  ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                                  : "border-white/10 bg-white/5 text-slate-200"
                            }`}
                          >
                            {s.codigo}
                          </span>
                        ))}
                        {arr.length > 12 && (
                          <span className="px-3 py-1.5 rounded-lg text-xs text-slate-500">
                            +{arr.length - 12}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </aside>
      </main>

      <footer className="border-t border-white/5 py-3 text-center text-[10px] uppercase tracking-[0.3em] text-slate-600">
        FilaMed · Atualização em tempo real
      </footer>

      {/* Overlay quando áudio está bloqueado pelo browser (autoplay policy).
          Um único toque/clique destrava e nunca mais aparece. */}
      {audioBlocked && (
        <button
          type="button"
          onClick={handleEnableSound}
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-slate-950/85 backdrop-blur-sm text-white transition-opacity"
        >
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/20 ring-4 ring-primary/40 animate-pulse">
            <Volume2 className="h-12 w-12 text-primary" />
          </div>
          <div className="text-center">
            <p className="font-display text-3xl font-bold">Toque para ativar o som</p>
            <p className="mt-2 text-sm text-slate-300">
              O navegador exige uma interação para iniciar o áudio. Depois disso, o painel anuncia automaticamente.
            </p>
          </div>
        </button>
      )}

    </div>
  );
}

function PrioridadeTag({ prioridade, big = false }: { prioridade: SenhaPrioridade; big?: boolean }) {
  const styles: Record<SenhaPrioridade, string> = {
    normal: "bg-white/10 text-slate-200 border-white/10",
    preferencial: "bg-amber-500/15 text-amber-200 border-amber-500/40",
    urgente: "bg-red-500/15 text-red-200 border-red-500/40",
  };
  const labels: Record<SenhaPrioridade, string> = {
    normal: "Normal",
    preferencial: "Preferencial",
    urgente: "Urgente",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold uppercase tracking-wide ${styles[prioridade]} ${
        big ? "text-sm px-4 py-1.5" : "text-[10px] px-2 py-0.5"
      }`}
    >
      {labels[prioridade]}
    </span>
  );
}
