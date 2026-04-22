import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { Clock, Users, Activity, Volume2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTvVisualConfig } from "@/hooks/use-tv-visual-config";
import { montarTextoChamada, type TemplateChamada } from "@/lib/voice-template";

// Tipagens básicas
type Senha = {
  id: string;
  codigo: string;
  status?: string;
  fila_nome?: string;
  paciente_nome?: string;
};

type Chamada = {
  id: string;
  senha_id: string;
  destino: string;
  created_at: string;
  senha?: Senha;
  // Campos vindos da nova RPC
  senha_codigo?: string;
  fila_nome?: string;
  paciente_nome?: string;
};

interface VoiceConfig {
  provider: "browser" | "google" | "elevenlabs";
  voice_id: string | null;
  rate: number;
  pitch: number;
  template_chamada: TemplateChamada;
}

type TvSearchParams = {
  debug?: boolean;
};

export const Route = createFileRoute("/tv/$slug")({
  validateSearch: (search: Record<string, unknown>): TvSearchParams => {
    return {
      debug: search.debug === true || search.debug === "true",
    };
  },
  loader: async ({ params: { slug } }) => {
    const { data: uniData, error: uniError } = await supabase
      .rpc("get_unidade_publica_by_slug", { _slug: slug });

    if (uniError) throw uniError;
    if (!uniData || uniData.length === 0) {
      throw new Error("Unidade não encontrada ou inativa.");
    }

    const unidade = uniData[0];
    const { data: chamadasData, error: chamadasError } = await supabase
      .rpc("get_chamadas_recentes_detalhadas", { _unidade_id: unidade.id });
    
    if (chamadasError) console.error("Erro ao buscar chamadas:", chamadasError);
    
    const chamadas = (chamadasData ?? []).map(c => ({
      ...c,
      senha: {
        id: c.senha_id,
        codigo: c.senha_codigo,
        fila_nome: c.fila_nome,
        paciente_nome: (c as any).paciente_nome,
      }
    }));

    return { unidade, initialChamadas: chamadas as Chamada[] };
  },
  component: TvPage,
});

function soletrar(codigo: string) {
  return codigo.split("").join(" ").replace(/0/g, "zero");
}

function formatarDestino(destino: string): string {
  const d = destino.trim().toLowerCase();
  if (d.startsWith("sala") || d.startsWith("guichê") || d.startsWith("consultório")) {
    return `ao ${destino.trim()}`;
  }
  return `ao destino ${destino.trim()}`;
}

function TvPage() {
  const { unidade, initialChamadas } = Route.useLoaderData();
  const [chamadas, setChamadas] = useState<Chamada[]>(initialChamadas);
  const [now, setNow] = useState(new Date());
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>({
    provider: "browser",
    voice_id: null,
    rate: 1,
    pitch: 1,
    template_chamada: "paciente_senha_fila_destino",
  });
  const [needsInteraction, setNeedsInteraction] = useState(true);
  const audioQueue = useRef<string[]>([]);
  const isSpeaking = useRef(false);
  const beepRef = useRef<HTMLAudioElement | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);

  
  // Hook de configuração visual (cores, logo, etc)
  const { config: visual } = useTvVisualConfig(unidade?.id);

  // Carrega configuração de voz
  useEffect(() => {
    if (!unidade?.id) return;
    void (async () => {
      const { data } = await supabase
        .from("unidade_voice_config")
        .select("provider, voice_id, rate, pitch, template_chamada")
        .eq("unidade_id", unidade.id)
        .maybeSingle();
      
      if (data) {
        setVoiceConfig({
          provider: (data.provider as any) || "browser",
          voice_id: data.voice_id,
          rate: Number(data.rate) || 1,
          pitch: Number(data.pitch) || 1,
          template_chamada: (data.template_chamada as TemplateChamada) || "paciente_senha_fila_destino",
        });
      } else {
        console.log("[TV] Usando configuração de voz padrão (navegador)");
      }
    })();
  }, [unidade?.id]);

  // Warm up voices
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      // Alguns navegadores precisam do evento voiceschanged
      const refresh = () => window.speechSynthesis.getVoices();
      window.speechSynthesis.addEventListener("voiceschanged", refresh);
      return () => window.speechSynthesis.removeEventListener("voiceschanged", refresh);
    }
  }, []);

  // Relógio

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const speak = useCallback(async (chamada: Chamada) => {
    const texto = montarTextoChamada({
      template: voiceConfig.template_chamada,
      nome: chamada.senha?.paciente_nome || null,
      codigoFalado: soletrar(chamada.senha?.codigo || ""),
      nomeFila: chamada.senha?.fila_nome || null,
      destino: chamada.destino,
      formatarDestino,
    });

    if (!texto.trim()) {
      console.warn("[TV] Texto de chamada vazio, ignorando voz.");
      return;
    }

    if (isSpeaking.current) {
      console.log("[TV] Já está falando, cancelando anterior e iniciando nova...");
      if (voiceConfig.provider === "browser") {
        window.speechSynthesis.cancel();
      } else if (voiceAudioRef.current) {
        voiceAudioRef.current.pause();
      }
    }

    console.log("[TV] Falando:", texto, "Provider:", voiceConfig.provider);
    isSpeaking.current = true;

    const finalize = () => {
      isSpeaking.current = false;
    };

    if (voiceConfig.provider === "browser") {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        console.warn("[TV] SpeechSynthesis não suportado.");
        finalize();
        return;
      }

      const synth = window.speechSynthesis;
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(texto);
      utterance.lang = "pt-BR";
      utterance.rate = voiceConfig.rate;
      utterance.pitch = voiceConfig.pitch;
      utterance.volume = 1; // Garante volume máximo
      utterance.onend = finalize;
      utterance.onerror = (e) => {
        console.error("[TV] Erro SpeechSynthesis:", e);
        finalize();
      };
      
      if (voiceConfig.voice_id) {
        const voices = synth.getVoices();
        const v = voices.find(x => x.name === voiceConfig.voice_id || x.voiceURI === voiceConfig.voice_id);
        if (v) utterance.voice = v;
      }
      
      setTimeout(() => synth.speak(utterance), 150);
    } else {
      try {
        const { data, error } = await supabase.functions.invoke("tts", {
          body: {
            text: texto,
            provider: voiceConfig.provider,
            voiceId: voiceConfig.voice_id,
            rate: voiceConfig.rate,
            pitch: voiceConfig.pitch,
          },
        });

        if (error) throw error;
        
        const audioData = data?.audioContent 
          ? `data:${data.mime || "audio/mpeg"};base64,${data.audioContent}`
          : null;

        if (audioData && voiceAudioRef.current) {
          const audio = voiceAudioRef.current;
          audio.src = audioData;
          audio.onended = finalize;
          audio.onerror = (e) => {
            console.error("[TV] Erro no elemento de áudio:", e);
            // Fallback para browser
            const u = new SpeechSynthesisUtterance(texto);
            u.lang = "pt-BR";
            u.onend = finalize;
            window.speechSynthesis.speak(u);
          };
          
          audio.play().catch(playErr => {
            console.error("[TV] Play bloqueado, tentando fallback WebSpeech:", playErr);
            const u = new SpeechSynthesisUtterance(texto);
            u.lang = "pt-BR";
            u.onend = finalize;
            window.speechSynthesis.speak(u);
          });
        } else if (data?.fallback === "browser" || !audioData) {
          console.log("[TV] Usando fallback de navegador (Web Speech)");
          const synth = window.speechSynthesis;
          synth.cancel();
          const u = new SpeechSynthesisUtterance(texto);
          u.lang = "pt-BR";
          u.onend = finalize;
          setTimeout(() => synth.speak(u), 150);
        } else {
          finalize();
        }
      } catch (err) {
        console.error("[TV] Erro ao reproduzir voz cloud, fallback browser:", err);
        const u = new SpeechSynthesisUtterance(texto);
        u.lang = "pt-BR";
        u.onend = finalize;
        window.speechSynthesis.speak(u);
      }
    }
  }, [voiceConfig, formatarDestino]);

  // Realtime para novas chamadas
  useEffect(() => {
    if (!unidade?.id) return;

    const channel = supabase
      .channel(`tv-realtime-${unidade.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chamadas",
          filter: `unidade_id=eq.${unidade.id}`,
        },
        async (payload) => {
          console.log("Nova chamada recebida:", payload.new);
          
          // Busca detalhes da senha para a nova chamada (incluindo paciente)
          const { data: senhaData } = await supabase
            .from("senhas")
            .select("id, codigo, status, filas(nome), pacientes(nome_completo)")
            .eq("id", payload.new.senha_id)
            .single();

          const novaChamada: Chamada = {
            ...(payload.new as Chamada),
            senha: {
              id: senhaData?.id as string,
              codigo: senhaData?.codigo as string,
              status: senhaData?.status as string,
              fila_nome: (senhaData?.filas as any)?.nome as string,
              paciente_nome: (senhaData?.pacientes as any)?.nome_completo as string,
            },
          };

          setChamadas(prev => [novaChamada, ...prev].slice(0, 10));
          
          // Beep inicial
          if (beepRef.current) {
            console.log("[TV] Tocando beep...");
            beepRef.current.currentTime = 0;
            beepRef.current.play().catch(e => {
              console.warn("[TV] Falha ao tocar beep via ref:", e);
              // Fallback se o ref falhar (tenta criar novo, embora improvável de funcionar se ref falhou)
              const b = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
              b.play().catch(() => {});
            });
          } else {
            console.warn("[TV] Beep ref não disponível.");
            const beep = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
            beep.play().catch(() => console.log("Áudio bloqueado pelo navegador"));
          }

          // Aguarda um pouco o beep e fala
          setTimeout(() => {
            void speak(novaChamada);
          }, 1500);

        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [unidade?.id, speak]);

  const ultimaChamada = chamadas[0];
  const historico = chamadas.slice(1, 6);

  if (needsInteraction) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-950 text-white p-10 text-center">
        <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 text-primary animate-pulse">
          <Volume2 className="h-10 w-10" />
        </div>
        <h1 className="mb-4 font-display text-3xl font-bold">Painel de Chamadas</h1>
        <p className="mb-8 max-w-md text-slate-400">
          Para que o painel possa anunciar as senhas por voz, é necessário uma interação inicial com a página.
        </p>
        <button
          onClick={() => {
            // Destravamento robusto de áudio
            const BEEP_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
            const audioBeep = new Audio(BEEP_URL);
            audioBeep.volume = 0.01;
            audioBeep.play().then(() => {
              console.log("[TV] Beep destravado");
              audioBeep.pause();
              audioBeep.volume = 1;
              beepRef.current = audioBeep;
            }).catch(e => console.error("Erro ao destravar beep:", e));

            // "Destrava" o áudio da voz
            const audioVoice = new Audio();
            audioVoice.volume = 0.01;
            audioVoice.play().then(() => {
              console.log("[TV] Voz (Audio) destravada");
              audioVoice.pause();
              audioVoice.volume = 1;
              voiceAudioRef.current = audioVoice;
            }).catch(e => console.error("Erro ao destravar voz (Audio):", e));

            // "Destrava" a voz nativa (SpeechSynthesis)
            const synth = window.speechSynthesis;
            const u = new SpeechSynthesisUtterance("");
            u.volume = 0;
            synth.speak(u);

            setNeedsInteraction(false);
          }}
          className="rounded-full bg-primary px-10 py-4 font-bold text-primary-foreground shadow-glow transition-transform hover:scale-105 active:scale-95"
        >
          Iniciar Painel
        </button>

      </div>
    );
  }

  return (
    <div 
      className="flex h-screen flex-col overflow-hidden font-sans transition-colors duration-500"
      style={{ 
        backgroundColor: visual.cor_fundo, 
        color: visual.cor_texto,
        backgroundImage: visual.fundo_url ? `url(${visual.fundo_url})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Overlay se tiver imagem de fundo */}
      {visual.fundo_url && <div className="absolute inset-0 bg-black/40 pointer-events-none" />}

      {/* Header */}
      <header className="relative flex items-center justify-between border-b border-white/10 bg-black/20 px-10 py-6 backdrop-blur-md">
        <div className="flex items-center gap-6">
          {visual.logo_url ? (
            <img src={visual.logo_url} alt="Logo" className="h-12 w-auto object-contain" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg">
              <Activity className="h-7 w-7 text-white" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{unidade?.nome}</h1>
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Conectado" />
            </div>
            <p className="text-sm font-medium opacity-60 uppercase tracking-widest">Painel de Chamadas</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-right">
            <p className="text-4xl font-mono font-bold">
              {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="text-sm font-medium opacity-60">
              {now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <button 
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
              } else {
                document.exitFullscreen();
              }
            }}
            className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            title="Tela Cheia"
          >
            <Activity className="h-6 w-6 opacity-40" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative flex flex-1 overflow-hidden">
        {/* Left Side: Current Call / Highlight */}
        <div className="flex-[2] flex flex-col items-center justify-center border-r border-white/10 p-10 bg-black/5">
          {ultimaChamada ? (
            <div className="w-full max-w-2xl animate-in fade-in zoom-in duration-500 text-center">
              <div 
                className="mb-8 inline-flex items-center gap-3 rounded-full bg-primary/20 px-6 py-2 text-primary border border-primary/30"
              >
                <Volume2 className="h-5 w-5 animate-pulse" />
                <span className="text-lg font-bold uppercase tracking-widest">Chamando Agora</span>
              </div>
              
              <div 
                className="mb-4 font-black leading-none tracking-tighter text-primary drop-shadow-2xl"
                style={{ fontSize: `${12 * visual.escala_chamadas}rem` }}
              >
                {ultimaChamada.senha?.codigo}
              </div>
              
              <div className="mt-4 space-y-2">
                {ultimaChamada.senha?.paciente_nome && (
                  <p className="text-5xl font-bold mb-6 text-white/90">{ultimaChamada.senha.paciente_nome}</p>
                )}
                <p className="text-4xl font-medium opacity-60 uppercase tracking-widest">Favor dirigir-se</p>
                <p className="text-7xl font-bold uppercase">{ultimaChamada.destino}</p>
              </div>
            </div>
          ) : (
            <div className="text-center opacity-30">
              <Users className="mx-auto mb-6 h-32 w-32" />
              <p className="text-3xl font-medium uppercase tracking-widest">Aguardando Chamadas</p>
            </div>
          )}
        </div>

        {/* Right Side: History / Last Calls */}
        <div className="flex-1 flex flex-col bg-black/10 backdrop-blur-sm">
          <div className="p-8 border-b border-white/10 bg-white/5">
            <h2 className="text-xl font-bold uppercase tracking-widest opacity-80 flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary" />
              Últimas Chamadas
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {historico.length > 0 ? (
              historico.map((chamada, idx) => (
                <div 
                  key={chamada.id}
                  className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-6 animate-in slide-in-from-right duration-300"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div>
                    <p className="text-4xl font-bold text-primary">{chamada.senha?.codigo}</p>
                    <p className="text-sm font-medium opacity-40 uppercase">
                      {chamada.senha?.paciente_nome ? `${chamada.senha.paciente_nome} • ` : ""}
                      {chamada.senha?.fila_nome || "Geral"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold opacity-80">{chamada.destino}</p>
                    <p className="text-xs font-mono opacity-30">
                      {new Date(chamada.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-full items-center justify-center opacity-20 italic">
                Nenhum histórico disponível
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer / Scrolling News or Info */}
      <footer className="relative h-16 flex items-center bg-primary px-10 text-primary-foreground font-bold overflow-hidden whitespace-nowrap">
        <div className="animate-marquee inline-block">
          {visual.mensagem_rodape || `Bem-vindo à ${unidade?.nome} • Por favor, acompanhe sua senha no painel • ${unidade?.nome} - Qualidade no atendimento`}
        </div>
      </footer>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
}

