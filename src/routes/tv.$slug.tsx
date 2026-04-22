import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { Clock, Users, Activity, Volume2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTvVisualConfig, RESOLUCAO_PRESETS } from "@/hooks/use-tv-visual-config";
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
  const { config: visual, connectionStatus: visualStatus } = useTvVisualConfig(unidade?.id);
  const [chamadasStatus, setChamadasStatus] = useState<string>("INITIALIZING");

  // Lógica de contraste
  const palette = (() => {
    if (visual.contraste_chamadas === "maximo") {
      return { 
        fundo: "#000000", 
        texto: "#FFFFFF", 
        primaria: "#FFD400",
        primariaForeground: "#000000"
      };
    }
    if (visual.contraste_chamadas === "alto") {
      return { 
        fundo: "#020617", 
        texto: "#FFFFFF", 
        primaria: visual.cor_primaria,
        primariaForeground: "#FFFFFF"
      };
    }
    return { 
      fundo: visual.cor_fundo, 
      texto: visual.cor_texto, 
      primaria: visual.cor_primaria,
      primariaForeground: visual.cor_texto // Tenta manter contraste do tema
    };
  })();

  // Injeta cores e escala global no CSS
  useEffect(() => {
    if (!visual) return;
    const root = document.documentElement;
    
    // Cores (respeitando contraste)
    root.style.setProperty("--primary", palette.primaria);
    root.style.setProperty("--primary-glow", palette.primaria);
    root.style.setProperty("--primary-foreground", palette.primariaForeground);
    
    // Escala baseada na resolução e ajuste de fonte
    const preset = RESOLUCAO_PRESETS[visual.resolucao_preset] || RESOLUCAO_PRESETS.fhd;
    const baseScale = preset.baseScale;
    const finalScale = visual.escala_fonte * baseScale;
    
    // Aplica no root para que todas as unidades 'rem' escalem
    root.style.fontSize = `${16 * finalScale}px`;
    
    return () => {
      root.style.fontSize = "";
      root.style.removeProperty("--primary");
      root.style.removeProperty("--primary-glow");
      root.style.removeProperty("--primary-foreground");
    };
  }, [visual, palette]);

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

  useEffect(() => {
    if (needsInteraction) return;
    
    const interval = setInterval(() => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const synth = window.speechSynthesis;
        if (!synth.speaking) {
          synth.resume();
          // Utterance silenciosa curta para manter o motor acordado
          const u = new SpeechSynthesisUtterance("");
          u.volume = 0;
          synth.speak(u);
        }
      }
    }, 30000); // a cada 30 segundos
    
    return () => clearInterval(interval);
  }, [needsInteraction]);

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

    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    
    // Sempre tenta dar resume no synth antes de qualquer operação de voz
    if (synth) {
      try {
        synth.resume();
      } catch (e) {
        console.warn("[TV] Erro ao dar resume no speechSynthesis:", e);
      }
    }

    if (isSpeaking.current) {
      console.log("[TV] Já está falando, cancelando anterior e iniciando nova...");
      if (synth) synth.cancel();
      if (voiceAudioRef.current) {
        voiceAudioRef.current.pause();
        voiceAudioRef.current.currentTime = 0;
      }
    }

    console.log("[TV] Tentando falar:", texto, "Provider:", voiceConfig.provider);
    isSpeaking.current = true;

    const finalize = () => {
      isSpeaking.current = false;
      console.log("[TV] Finalizou processo de fala.");
    };

    const createUtterance = (t: string) => {
      const u = new SpeechSynthesisUtterance(t);
      u.lang = "pt-BR";
      u.rate = voiceConfig.rate || 1;
      u.pitch = voiceConfig.pitch || 1;
      u.volume = 1;
      u.onend = finalize;
      u.onerror = (e) => {
        console.error("[TV] Erro SpeechSynthesis:", e);
        finalize();
      };
      
      if (voiceConfig.voice_id && synth) {
        const voices = synth.getVoices();
        const v = voices.find(x => x.name === voiceConfig.voice_id || x.voiceURI === voiceConfig.voice_id);
        if (v) u.voice = v;
      }
      return u;
    };

    if (voiceConfig.provider === "browser") {
      if (!synth) {
        console.warn("[TV] SpeechSynthesis não suportado.");
        finalize();
        return;
      }

      synth.cancel();
      const utterance = createUtterance(texto);
      // Removido o delay fixo de 200ms para o synth nativo do navegador (notebook)
      if (synth) {
        synth.resume();
        synth.speak(utterance);
      }
    } else {
      // Provedor Cloud (ElevenLabs / Google)
      try {
        console.log(`[TV] Chamando Edge Function tts para ${voiceConfig.provider}...`);
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
        
        const audioSrc = data?.audioUrl || (data?.audioContent 
          ? `data:${data.mime || "audio/mpeg"};base64,${data.audioContent}`
          : null);

        if (audioSrc) {
          // Usa o ref se estiver disponível, senão cria um novo temporário
          // Algumas TVs preferem novos elementos se o anterior "engasgou"
          const audio = voiceAudioRef.current || new Audio();
          
          // Importante para Firestick: resetar o estado antes de novo src
          audio.pause();
          audio.currentTime = 0;
          audio.src = audioSrc;
          audio.onended = finalize;
          
          audio.onerror = (e) => {
            console.error("[TV] Erro no carregamento do áudio cloud, fallback browser:", e);
            if (synth) {
              synth.cancel();
              const u = createUtterance(texto);
              synth.speak(u);
            } else {
              finalize();
            }
          };
          
          // Removido audio.load() redundante que pode atrasar o play em algumas SmartTVs
          audio.play().catch(playErr => {
            console.error("[TV] Play cloud bloqueado ou falhou, fallback browser:", playErr);
            if (synth) {
              synth.cancel();
              const u = createUtterance(texto);
              synth.speak(u);
            } else {
              finalize();
            }
          });
        } else if (data?.fallback === "browser" || !audioSrc) {
          console.log("[TV] Cloud indisponível, usando fallback de navegador");
          if (synth) {
            synth.cancel();
            const u = createUtterance(texto);
            // Reduzido delay de fallback para feedback mais rápido
            if (synth) {
              synth.resume();
              synth.speak(u);
            }
          } else {
            finalize();
          }
        } else {
          finalize();
        }
      } catch (err) {
        console.error("[TV] Falha crítica na chamada cloud, tentando fallback browser:", err);
        if (synth) {
          synth.cancel();
          const u = createUtterance(texto);
          synth.speak(u);
        } else {
          finalize();
        }
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
          
          // 1. Toca o beep IMEDIATAMENTE para dar feedback instantâneo (0s de delay)
          if (beepRef.current) {
            try {
              beepRef.current.currentTime = 0;
              beepRef.current.play().catch(e => {
                console.warn("[TV] Falha ao tocar beep via ref:", e);
                const b = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
                b.play().catch(() => {});
              });
            } catch (e) {
              console.warn("[TV] Erro ao preparar/tocar beep:", e);
            }
          } else {
            const beep = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
            beep.play().catch(() => console.log("Áudio bloqueado pelo navegador"));
          }

          const getJoinedField = (field: any, key: string) => {
            if (!field) return null;
            if (Array.isArray(field)) return field[0]?.[key] || null;
            return field[key] || null;
          };

          // 2. Constrói objeto de chamada com dados do payload (instantâneo)
          // Isso permite iniciar a voz IMEDIATAMENTE sem esperar queries de banco
          const novaChamada: Chamada = {
            ...(payload.new as Chamada),
            senha: {
              id: (payload.new as any).senha_id as string,
              codigo: (payload.new as any).senha_codigo as string,
              status: "chamando",
              fila_nome: (payload.new as any).fila_nome || "Fila",
              paciente_nome: (payload.new as any).paciente_nome || null,
            },
          };

          // 3. Inicia a fala IMEDIATAMENTE (paralelo ao fetch de detalhes)
          // Removido o timeout de 100ms para ser o mais rápido possível
          void speak(novaChamada);
          
          // 4. Atualiza a lista na UI imediatamente
          setChamadas(prev => [novaChamada, ...prev].slice(0, 10));

          // 5. Busca detalhes extras em background apenas para garantir integridade da UI
          // (Não bloqueia o beep nem a voz)
          void (async () => {
            let senhaData = null;
            let retryCount = 0;
            const maxRetries = 2;
            
            while (retryCount < maxRetries && !senhaData) {
              const { data } = await supabase
                .from("senhas")
                .select("id, codigo, status, filas(nome), pacientes(nome_completo)")
                .eq("id", payload.new.senha_id)
                .maybeSingle();
              
              if (data) {
                senhaData = data;
                break;
              }
              
              retryCount++;
              if (retryCount < maxRetries) await new Promise(r => setTimeout(r, 200));
            }

            if (senhaData) {
              const chamadaAtualizada: Chamada = {
                ...novaChamada,
                senha: {
                  id: senhaData.id,
                  codigo: senhaData.codigo,
                  status: senhaData.status,
                  fila_nome: getJoinedField(senhaData.filas, "nome") || (payload.new as any).fila_nome,
                  paciente_nome: getJoinedField(senhaData.pacientes, "nome_completo") || (payload.new as any).paciente_nome,
                },
              };
              setChamadas(prev => prev.map(c => c.id === payload.new.id ? chamadaAtualizada : c));
            }
          })();
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
            console.log("[TV] Iniciando painel e destravando áudio...");
            // Destravamento robusto de áudio para TV Firestick e outros dispositivos
            const BEEP_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
            
            const audioBeep = new Audio(BEEP_URL);
            audioBeep.volume = 0.01;
            
            const audioVoice = new Audio(BEEP_URL); // Usa o mesmo beep para destravar com som real
            audioVoice.volume = 0.01;

            const unlock = async () => {
              try {
                await audioBeep.play();
                audioBeep.pause();
                audioBeep.volume = 1;
                beepRef.current = audioBeep;
                console.log("[TV] Beep destravado");
              } catch (e) {
                console.warn("Falha ao destravar beep:", e);
                beepRef.current = audioBeep;
              }

              try {
                await audioVoice.play();
                audioVoice.pause();
                audioVoice.volume = 1;
                audioVoice.src = ""; // Limpa o src do beep para receber a voz depois
                voiceAudioRef.current = audioVoice;
                console.log("[TV] Voz (Audio) destravada");
              } catch (e) {
                console.warn("Falha ao destravar voz (Audio):", e);
                voiceAudioRef.current = audioVoice;
              }

              // "Destrava" a voz nativa (SpeechSynthesis)
              if (typeof window !== "undefined" && window.speechSynthesis) {
                const synth = window.speechSynthesis;
                synth.cancel();
                const u = new SpeechSynthesisUtterance(" ");
                u.volume = 0;
                synth.speak(u);
                console.log("[TV] SpeechSynthesis destravado");
              }
              
              setNeedsInteraction(false);
            };

            void unlock();
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
        backgroundColor: palette.fundo, 
        color: palette.texto,
        backgroundImage: (visual.contraste_chamadas === 'normal' && visual.fundo_url) ? `url(${visual.fundo_url})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Overlay se tiver imagem de fundo */}
      {(visual.contraste_chamadas === 'normal' && visual.fundo_url) && <div className="absolute inset-0 bg-black/40 pointer-events-none" />}

      {/* Header */}
      <header className={`relative flex items-center justify-between border-b border-white/10 bg-black/20 backdrop-blur-md transition-all ${visual.densidade === 'compacto' ? 'px-8 py-3' : 'px-10 py-6'}`}>
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
        <div className={`flex-[2] flex flex-col items-center justify-center border-r border-white/10 bg-black/5 transition-all ${visual.densidade === 'compacto' ? 'p-6' : 'p-10'}`}>
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
                  className={`flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 animate-in slide-in-from-right duration-300 ${visual.densidade === 'compacto' ? 'p-4' : 'p-6'}`}
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div>
                    <p className="font-bold text-primary" style={{ fontSize: `${2.25 * visual.escala_chamadas}rem` }}>{chamada.senha?.codigo}</p>
                    <p className="font-medium opacity-40 uppercase" style={{ fontSize: `${0.875 * visual.escala_chamadas}rem` }}>
                      {chamada.senha?.paciente_nome ? `${chamada.senha.paciente_nome} • ` : ""}
                      {chamada.senha?.fila_nome || "Geral"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold opacity-80" style={{ fontSize: `${1.5 * visual.escala_chamadas}rem` }}>{chamada.destino}</p>
                    <p className="font-mono opacity-30" style={{ fontSize: `${0.75 * visual.escala_chamadas}rem` }}>
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

