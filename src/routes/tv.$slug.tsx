import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Clock, Users, Activity, Volume2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTvVisualConfig } from "@/hooks/use-tv-visual-config";
import { TvCarrossel } from "@/components/tv-carrossel";
import { TvZoomControl } from "@/components/tv-zoom-control";
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
  observacao?: string | null;
  senha?: Senha;
  // Campos vindos da nova RPC
  senha_codigo?: string;
  fila_nome?: string;
  paciente_nome?: string;
};

/** Detecta se uma chamada é uma rechamada (manual ou automática). */
function isRechamada(c: Pick<Chamada, "observacao">): boolean {
  return (c.observacao ?? "").trim().toLowerCase() === "rechamada";
}

/**
 * Remove qualquer prefixo "Rechamada" / "Rechamada —" / "Rechamada -" /
 * "Rechamada:" do destino. Defesa contra dados antigos/legados gravados antes
 * da regra de "rechamada vai só na badge/áudio, nunca no destino".
 */
function limparDestino(destino: string | null | undefined): string {
  if (!destino) return "";
  return destino
    .replace(/^\s*rechamada\s*[—\-:.]*\s*/i, "")
    .trim();
}

/**
 * Mapeia o `status` da senha para um label curto exibido como badge no
 * histórico da TV. Retorna `null` para status que não devem aparecer
 * (aguardando, chamada, etc).
 */
function statusLabel(status: string | undefined | null): {
  label: string;
  cls: string;
} | null {
  switch (status) {
    case "em_atendimento":
      return { label: "Em atendimento", cls: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40" };
    case "finalizada":
      return { label: "Atendimento finalizado", cls: "bg-sky-500/20 text-sky-300 border-sky-400/40" };
    case "ausente":
      return { label: "Ausente", cls: "bg-amber-500/20 text-amber-300 border-amber-400/40" };
    case "cancelada":
      return { label: "Cancelada", cls: "bg-rose-500/20 text-rose-300 border-rose-400/40" };
    default:
      return null;
  }
}

interface VoiceConfig {
  provider: "browser" | "google" | "elevenlabs";
  voice_id: string | null;
  rate: number;
  pitch: number;
  template_chamada: TemplateChamada;
}

type TvSearchParams = {
  debug?: boolean;
  /**
   * Filtro multi-TV: lista de pontos (por ID, slug ou nome literal) cujas
   * chamadas devem ser exibidas nesta TV. Aceita vários separados por vírgula.
   * Exemplos:
   *   /tv/clinica?ponto=Consultório%20001
   *   /tv/clinica?ponto=Consultório%20001,Consultório%20002
   *   /tv/clinica?ponto=<uuid-do-ponto>
   * Quando ausente, a TV exibe TODAS as chamadas da unidade (modo único).
   */
  ponto?: string;
  /**
   * Filtro alternativo por TIPO de ponto (guiche, consultorio, exame, outro).
   * Útil pra TV genérica de "consultórios" sem listar 1 a 1.
   *   /tv/clinica?tipos=consultorio
   *   /tv/clinica?tipos=guiche,consultorio
   */
  tipos?: string;
};

export const Route = createFileRoute("/tv/$slug")({
  validateSearch: (search: Record<string, unknown>): TvSearchParams => {
    return {
      debug: search.debug === true || search.debug === "true",
      ponto: typeof search.ponto === "string" ? search.ponto : undefined,
      tipos: typeof search.tipos === "string" ? search.tipos : undefined,
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

    // Busca pontos da unidade pra resolver IDs/tipos do filtro client-side.
    // Esta query usa a policy pública de leitura via RPC dedicada — caso ela
    // não exista, ignoramos silenciosamente (filtro por nome continua valendo).
    const { data: pontosData } = await supabase
      .from("pontos_atendimento")
      .select("id, nome, tipo, ativo")
      .eq("unidade_id", unidade.id)
      .eq("ativo", true);

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

    return {
      unidade,
      initialChamadas: chamadas as Chamada[],
      pontos: (pontosData ?? []) as Array<{ id: string; nome: string; tipo: string; ativo: boolean }>,
    };
  },
  component: TvPage,
});

/**
 * Resolve a lista de NOMES DE DESTINOS aceitos para esta TV, a partir dos
 * filtros `?ponto=` e `?tipos=` cruzados com os pontos cadastrados.
 *
 * - Sem filtro → retorna `null` (= aceita tudo).
 * - Com filtro → retorna `Set<string>` de nomes (case-insensitive, normalizado).
 *
 * Aceita no `?ponto=` tanto UUID quanto nome literal — útil pra setup manual
 * em quem só sabe escrever "Consultório 001" no Fire TV.
 */
function resolverFiltroDestinos(
  pontoParam: string | undefined,
  tiposParam: string | undefined,
  pontos: Array<{ id: string; nome: string; tipo: string }>,
): Set<string> | null {
  if (!pontoParam && !tiposParam) return null;

  const norm = (s: string) => s.trim().toLowerCase();
  const aceitos = new Set<string>();

  if (pontoParam) {
    const tokens = pontoParam.split(",").map((t) => t.trim()).filter(Boolean);
    for (const tok of tokens) {
      // Match por ID (UUID) ou nome
      const porId = pontos.find((p) => p.id === tok);
      const porNome = pontos.find((p) => norm(p.nome) === norm(tok));
      if (porId) aceitos.add(norm(porId.nome));
      else if (porNome) aceitos.add(norm(porNome.nome));
      else aceitos.add(norm(tok)); // fallback: aceita literal mesmo sem cadastro
    }
  }

  if (tiposParam) {
    const tipos = new Set(tiposParam.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean));
    for (const p of pontos) {
      if (tipos.has(p.tipo.toLowerCase())) aceitos.add(norm(p.nome));
    }
  }

  return aceitos.size > 0 ? aceitos : null;
}

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
  const { unidade, initialChamadas, pontos } = Route.useLoaderData();
  const { ponto: pontoParam, tipos: tiposParam } = Route.useSearch();

  /**
   * Set de destinos aceitos por esta TV (case-insensitive). `null` = sem filtro.
   * Reage à mudança de querystring sem reload — útil pra trocar a TV de papel
   * remotamente (ex.: redirecionar /tv/clinica?ponto=X via URL).
   */
  const destinosAceitos = useMemo(
    () => resolverFiltroDestinos(pontoParam, tiposParam, pontos),
    [pontoParam, tiposParam, pontos],
  );

  /**
   * Aplica o filtro de destinos. Quando não há filtro, mantém a chamada como
   * está. Comparação por destino normalizado (lowercase + trim) — case e
   * espaços não devem quebrar o match.
   */
  const matchDestino = useCallback(
    (destino: string | null | undefined): boolean => {
      if (!destinosAceitos) return true;
      const d = limparDestino(destino).toLowerCase().trim();
      if (!d) return false;
      return destinosAceitos.has(d);
    },
    [destinosAceitos],
  );

  // Aplica filtro inicial às chamadas vindas do loader.
  const [chamadas, setChamadas] = useState<Chamada[]>(() =>
    destinosAceitos ? initialChamadas.filter((c) => matchDestino(c.destino)) : initialChamadas,
  );

  /**
   * Mapa de senha_id -> status atual, populado via realtime de UPDATE em
   * `senhas`. Usado para:
   *  - Esconder do "Chamando agora" quando a senha sai do estado "chamada"
   *    (vira em_atendimento/finalizada/ausente/cancelada).
   *  - Mostrar um badge no histórico indicando o status final ("Em atendimento",
   *    "Atendimento finalizado" ou "Ausente").
   */
  const [statusSenhas, setStatusSenhas] = useState<Record<string, string>>({});
  const senhasInativas = useMemo(() => {
    const set = new Set<string>();
    const finais = ["em_atendimento", "finalizada", "ausente", "cancelada"];
    for (const [id, st] of Object.entries(statusSenhas)) {
      if (finais.includes(st)) set.add(id);
    }
    return set;
  }, [statusSenhas]);
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
  const [isSpeakingState, setIsSpeakingState] = useState(false);
  const beepRef = useRef<HTMLAudioElement | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);

  
  // Hook de configuração visual (cores, logo, etc)
  const { config: visual, loading, setConfig } = useTvVisualConfig(unidade?.id);

  // Zoom local (prioriza localStorage, mas usa o da unidade se não houver local)
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!loading && visual) {
      const localZoom = localStorage.getItem(`tv-zoom-${unidade?.id}`);
      if (localZoom) {
        setZoom(Number(localZoom));
      } else {
        setZoom(visual.zoom_nivel || 1);
      }
    }
  }, [loading, visual, unidade?.id]);

  const updateZoom = (newZoom: number) => {
    const z = Math.max(0.2, Math.min(3, newZoom));
    setZoom(z);
    localStorage.setItem(`tv-zoom-${unidade?.id}`, String(z));
  };

  // Safe area local
  const [safeArea, setSafeArea] = useState(0);

  useEffect(() => {
    if (!loading && visual) {
      const localSA = localStorage.getItem(`tv-safe-area-${unidade?.id}`);
      if (localSA !== null) {
        setSafeArea(Number(localSA));
      } else {
        setSafeArea(visual.safe_area_padding || 0);
      }
    }
  }, [loading, visual, unidade?.id]);

  const updateSafeArea = (val: number) => {
    setSafeArea(val);
    localStorage.setItem(`tv-safe-area-${unidade?.id}`, String(val));
  };


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

  // Busca status atual das senhas que aparecem no histórico (precisa pra
  // mostrar badges "em atendimento" / "ausente" / "atendimento finalizado").
  // Roda quando entram novas chamadas e ainda não conhecemos o status delas.
  useEffect(() => {
    if (!unidade?.id) return;
    const idsFaltando = Array.from(
      new Set(
        chamadas
          .map((c) => c.senha?.id)
          .filter((id): id is string => typeof id === "string" && id.length > 0 && !(id in statusSenhas)),
      ),
    );
    if (idsFaltando.length === 0) return;
    void (async () => {
      const { data } = await supabase
        .from("senhas")
        .select("id, status")
        .in("id", idsFaltando);
      if (!data) return;
      setStatusSenhas((prev) => {
        const next = { ...prev };
        for (const row of data) {
          if (row.id && row.status) next[row.id] = row.status;
        }
        return next;
      });
    })();
  }, [unidade?.id, chamadas, statusSenhas]);

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
    const destinoLimpo = limparDestino(chamada.destino);
    const textoBase = montarTextoChamada({
      template: voiceConfig.template_chamada,
      nome: chamada.senha?.paciente_nome || null,
      codigoFalado: soletrar(chamada.senha?.codigo || ""),
      nomeFila: chamada.senha?.fila_nome || null,
      destino: destinoLimpo,
      formatarDestino,
    });

    // Para rechamadas (manuais ou automáticas), prefixa "Rechamada." no áudio
    // sem nunca alterar o texto do destino exibido na TV.
    const texto = isRechamada(chamada) ? `Rechamada. ${textoBase}` : textoBase;

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
    setIsSpeakingState(true);

    const finalize = () => {
      isSpeaking.current = false;
      setIsSpeakingState(false);
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
            setTimeout(() => {
              if (synth) {
                synth.resume();
                synth.speak(u);
              }
            }, 200);
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

          // Filtro multi-TV: ignora chamadas cujo destino não pertence a esta TV.
          // Faz isso ANTES do beep pra TV de "Consultório 001" não tocar quando
          // a senha é chamada no "Guichê 02".
          const destinoChamada = (payload.new as { destino?: string })?.destino;
          if (!matchDestino(destinoChamada)) {
            console.log("[TV] Chamada ignorada por filtro multi-TV:", destinoChamada);
            return;
          }

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

          // 2. Busca detalhes da senha em paralelo (enquanto o beep toca)
          let senhaData = null;
          let retryCount = 0;
          const maxRetries = 2; // Reduzido de 3 para 2 para ser mais rápido
          
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
            console.log(`[TV] Senha não encontrada para chamada ${payload.new.id}, retry ${retryCount}...`);
            if (retryCount < maxRetries) await new Promise(r => setTimeout(r, 200)); // Reduzido de 500ms para 200ms
          }

          const getJoinedField = (field: any, key: string) => {
            if (!field) return null;
            if (Array.isArray(field)) return field[0]?.[key] || null;
            return field[key] || null;
          };

          const novaChamada: Chamada = {
            ...(payload.new as Chamada),
            senha: {
              id: (senhaData?.id || payload.new.senha_id) as string,
              codigo: (senhaData?.codigo || (payload.new as any).senha_codigo) as string,
              status: senhaData?.status as string,
              fila_nome: getJoinedField(senhaData?.filas, "nome") || (payload.new as any).fila_nome,
              paciente_nome: getJoinedField(senhaData?.pacientes, "nome_completo") || (payload.new as any).paciente_nome,
            },
          };

          setChamadas(prev => [novaChamada, ...prev].slice(0, (visual.historico_limite || 8) + 2));
          
          // 3. Inicia a fala logo após o início do beep (reduzido de 800ms para 100ms)
          // Isso faz com que a voz comece quase junto ou logo após o "bipe" inicial
          setTimeout(() => {
            void speak(novaChamada);
          }, 100);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [unidade?.id, speak]);

  /**
   * Realtime de senhas — escutamos UPDATE para detectar quando uma senha sai
   * do estado "chamada" (vira em_atendimento, finalizada, ausente ou cancelada).
   * Quando isso acontece, marcamos como inativa pra remover instantaneamente
   * do bloco "Chamando agora", sem precisar esperar uma nova chamada chegar.
   */
  useEffect(() => {
    if (!unidade?.id) return;
    const ch = supabase
      .channel(`tv-senhas-${unidade.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "senhas",
          filter: `unidade_id=eq.${unidade.id}`,
        },
        (payload) => {
          const novo = payload.new as { id: string; status?: string };
          if (novo.status) {
            setStatusSenhas((prev) => {
              if (prev[novo.id] === novo.status) return prev;
              return { ...prev, [novo.id]: novo.status! };
            });
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [unidade?.id]);

  /**
   * Realtime de DELETE em `chamadas` — quando a recepção clica "Resetar
   * histórico", as chamadas finalizadas/ausentes/canceladas são apagadas e a
   * TV precisa refletir isso instantaneamente, sem reload.
   */
  useEffect(() => {
    if (!unidade?.id) return;
    const ch = supabase
      .channel(`tv-chamadas-del-${unidade.id}`)
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "chamadas",
          filter: `unidade_id=eq.${unidade.id}`,
        },
        (payload) => {
          const removida = payload.old as { id?: string };
          if (!removida?.id) return;
          setChamadas((prev) => prev.filter((c) => c.id !== removida.id));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [unidade?.id]);

  // Lógica de Autoajuste de Escala e Padding
  const [autoStyles, setAutoStyles] = useState<{ scale: number; padding: number }>({ scale: 1, padding: 8 });

  useEffect(() => {
    if (!visual.auto_ajuste) {
      setAutoStyles({ scale: 1, padding: 8 });
      return;
    }

    const adjust = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      
      // Define a resolução base dependendo do aspect ratio selecionado
      const baseW = visual.aspect_ratio === "4:3" ? 1440 : 1920;
      const baseH = 1080;
      
      // Escala baseada na resolução alvo
      const baseScale = Math.min(vw / baseW, vh / baseH);
      
      // Padding dinâmico (entre 10 e 40px dependendo da escala)
      const dynamicPadding = Math.max(10, Math.min(40, 24 * baseScale));
      
      setAutoStyles({ 
        scale: baseScale * visual.escala_fonte, 
        padding: dynamicPadding 
      });
    };

    adjust();
    window.addEventListener("resize", adjust);
    return () => window.removeEventListener("resize", adjust);
  }, [visual.auto_ajuste, visual.escala_fonte, visual.aspect_ratio]);

  /**
   * Regras de exibição:
   * - O histórico mostra apenas chamadas únicas (originais), nunca rechamadas —
   *   rechamada não vira nova entrada na lista, é só destaque temporário.
   * - O "Chamando agora" exibe a chamada (original ou rechamada) mais recente
   *   da senha que ainda está no estado "chamada"; se a senha já saiu pra
   *   atendimento/ausente/finalizada, o bloco fica vazio (volta ao "aguardando").
   */
  const HISTORICO_MAX = 5;
  const chamadasOriginais = useMemo(
    () => chamadas.filter((c) => !isRechamada(c)),
    [chamadas],
  );
  const ultimaChamada = useMemo(() => {
    // Mostra APENAS a chamada mais recente (índice 0). Se a senha dela já saiu
    // do estado "chamada" (foi para atendimento/finalizada/ausente/cancelada),
    // o bloco fica vazio — nunca cai pra uma chamada antiga de outra senha.
    const top = chamadas[0];
    if (!top) return null;
    if (top.senha?.id && senhasInativas.has(top.senha.id)) return null;
    return top;
  }, [chamadas, senhasInativas]);
  const historico = useMemo(() => {
    // Pula a "ultimaChamada" (se ela ainda for visível) e mostra o restante,
    // só com chamadas únicas (sem rechamadas) e sem duplicar a mesma senha.
    const vistas = new Set<string>();
    if (ultimaChamada?.senha?.id) vistas.add(ultimaChamada.senha.id);
    const limite = Math.min(visual.historico_limite || 5, HISTORICO_MAX);
    const out: Chamada[] = [];
    for (const c of chamadasOriginais) {
      const sid = c.senha?.id;
      if (sid && vistas.has(sid)) continue;
      if (sid) vistas.add(sid);
      out.push(c);
      if (out.length >= limite) break;
    }
    return out;
  }, [chamadasOriginais, ultimaChamada, visual.historico_limite]);

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
      className="flex h-screen w-screen flex-col overflow-hidden font-sans transition-all duration-500 relative"
      style={{ 
        backgroundColor: visual.cor_fundo, 
        color: visual.cor_texto,
        backgroundImage: visual.fundo_url ? `url(${visual.fundo_url})` : undefined,
        fontSize: visual.auto_ajuste ? `${autoStyles.scale * zoom}rem` : `${visual.escala_fonte * zoom}rem`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: `${safeArea * 100}vh ${safeArea * 100}vw`,
      }}
    >
      {/* Overlay se tiver imagem de fundo */}
      {visual.fundo_url && <div className="absolute inset-0 bg-black/40 pointer-events-none" />}

      {/* Header */}
      <header 
        className="relative flex items-center justify-between border-b border-white/10 bg-black/20 px-10 backdrop-blur-md"
        style={{ 
          height: `${3 * (visual.escala_header ?? 1)}rem`,
          paddingTop: `${0.5 * (visual.escala_header ?? 1)}rem`,
          paddingBottom: `${0.5 * (visual.escala_header ?? 1)}rem`
        }}
      >
        <div className="flex items-center gap-3" style={{ transform: `scale(${visual.escala_header ?? 1})`, transformOrigin: 'left center' }}>
          {visual.logo_url ? (
            <img src={visual.logo_url} alt="Logo" className="h-7 w-auto object-contain" />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary shadow-lg">
              <Activity className="h-4 w-4 text-white" />
            </div>
          )}
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold tracking-tight leading-none">{unidade?.nome}</h1>
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" title="Conectado" />
            <p className="text-[10px] font-medium opacity-60 uppercase tracking-widest leading-none">Painel de Chamadas</p>
          </div>
        </div>

        <div className="flex items-center gap-4" style={{ transform: `scale(${visual.escala_header ?? 1})`, transformOrigin: 'right center' }}>
          <div className="flex items-center gap-3">
            <p className="text-xl font-mono font-bold leading-none">
              {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="text-[10px] font-medium opacity-60 leading-none">
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
      <main 
        className="relative flex-1 overflow-hidden grid"
        style={{
          gap: visual.auto_ajuste ? `${autoStyles.padding / 2}px` : '8px',
          padding: visual.auto_ajuste ? `${autoStyles.padding}px` : '8px',
          gridTemplateColumns: `repeat(${visual.layout_grid_cols || 12}, 1fr)`,
          gridTemplateRows: `repeat(${visual.layout_grid_rows || 6}, 1fr)`,
        }}
      >
        {visual.layout_items.sort((a, b) => a.order - b.order).map((item, idx) => {
          if (item.type === "chamada_atual") {
            const escChamada = visual.escala_chamadas ?? 1;
            return (
              <div 
                key={`item-${idx}`}
                className="flex flex-col items-center justify-center border border-white/10 bg-black/5 rounded-2xl overflow-hidden"
                style={{
                  gridColumn: `span ${item.col_span}`,
                  gridRow: `span ${item.row_span}`,
                  containerType: "size",
                  padding: "clamp(0.25rem, 0.8cqmin, 0.6rem)",
                }}
              >
                {ultimaChamada ? (
                  <div
                    key={ultimaChamada.id}
                    className="w-full h-full flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500 text-center"
                  >
                    <div
                      className="inline-flex items-center gap-2 flex-wrap justify-center"
                      style={{ marginBottom: `clamp(0.15rem, 0.6cqmin, 0.5rem)` }}
                    >
                      <div
                        className="inline-flex items-center gap-2 rounded-full bg-red-600/20 text-red-500 border border-red-500/40"
                        style={{
                          padding: `clamp(0.1rem, 0.6cqmin, 0.35rem) clamp(0.4rem, 1.2cqmin, 0.9rem)`,
                        }}
                      >
                        <Volume2
                          className="animate-pulse"
                          style={{ width: `clamp(0.75rem, 1.8cqmin, 1.25rem)`, height: `clamp(0.75rem, 1.8cqmin, 1.25rem)` }}
                        />
                        <span
                          className="font-bold uppercase tracking-widest"
                          style={{ fontSize: `clamp(0.5rem, 1.6cqmin, 1rem)` }}
                        >
                          Chamando Agora
                        </span>
                      </div>
                      {isRechamada(ultimaChamada) && (
                        <div
                          className="inline-flex items-center gap-1 rounded-full bg-amber-500/25 text-amber-300 border border-amber-400/50 animate-badge-rechamada"
                          style={{
                            padding: `clamp(0.1rem, 0.6cqmin, 0.35rem) clamp(0.4rem, 1.2cqmin, 0.9rem)`,
                          }}
                        >
                          <span
                            className="font-black uppercase tracking-widest"
                            style={{ fontSize: `clamp(0.5rem, 1.6cqmin, 1rem)` }}
                          >
                            Rechamada
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Senha — usa cqmin (menor dimensão do container) pra escalar
                        proporcionalmente ao espaço disponível, garantindo que nunca
                        ultrapasse vertical nem horizontalmente. clamp protege min/max
                        e a escala_chamadas continua sendo o multiplicador final.
                        A animação senha-pop dá um overshoot ao trocar de senha. */}
                    <div 
                      key={`codigo-${ultimaChamada.senha?.id ?? ultimaChamada.id}`}
                      className="font-black leading-[0.9] tracking-tighter text-primary drop-shadow-2xl w-full px-2 animate-senha-pop"
                      style={{ 
                        fontSize: `clamp(2rem, ${22 * escChamada}cqmin, ${10 * escChamada}rem)`,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={ultimaChamada.senha?.codigo}
                    >
                      {ultimaChamada.senha?.codigo}
                    </div>
                    
                    <div 
                      className="w-full"
                      style={{ marginTop: `clamp(0.15rem, 0.8cqmin, 0.5rem)` }}
                    >
                      {ultimaChamada.senha?.paciente_nome && (
                        <p 
                          className={`font-bold text-white/90 px-2 ${visual.historico_quebrar_texto ? "" : "truncate"}`}
                          style={{ fontSize: `clamp(0.75rem, 4cqmin, 2rem)`, lineHeight: 1.1 }}
                          title={ultimaChamada.senha.paciente_nome}
                        >
                          {ultimaChamada.senha.paciente_nome}
                        </p>
                      )}
                      <p 
                        className="font-medium opacity-60 uppercase tracking-widest"
                        style={{ 
                          fontSize: `clamp(0.5rem, 1.8cqmin, 1.125rem)`,
                          marginTop: `clamp(0.1rem, 0.4cqmin, 0.3rem)`,
                          marginBottom: `clamp(0.1rem, 0.4cqmin, 0.3rem)`,
                        }}
                      >
                        Favor dirigir-se
                      </p>
                      <p 
                        className={`font-bold uppercase px-2 ${visual.historico_quebrar_texto ? "" : "truncate"}`}
                        style={{ fontSize: `clamp(1rem, 6cqmin, 3rem)`, lineHeight: 1.05 }}
                        title={limparDestino(ultimaChamada.destino)}
                      >
                        {limparDestino(ultimaChamada.destino)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center opacity-30">
                    <Users 
                      className="mx-auto" 
                      style={{ 
                        width: `clamp(2rem, 8cqmin, 4rem)`, 
                        height: `clamp(2rem, 8cqmin, 4rem)`,
                        marginBottom: `clamp(0.5rem, 2cqmin, 1rem)`,
                      }}
                    />
                    <p 
                      className="font-medium uppercase tracking-widest"
                      style={{ fontSize: `clamp(0.625rem, 2.5cqmin, 1.25rem)` }}
                    >
                      Aguardando Chamada
                    </p>
                  </div>
                )}
              </div>
            );
          }

          if (item.type === "historico") {
            return (
              <div 
                key={`item-${idx}`}
                className="@container flex flex-col bg-black/10 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden"
                style={{
                  gridColumn: `span ${item.col_span}`,
                  gridRow: `span ${item.row_span}`,
                  containerType: "size",
                }}
              >
                <div
                  className="border-b border-white/10 bg-white/5 flex items-center"
                  style={{ padding: "clamp(0.5rem, 3cqmin, 1rem)" }}
                >
                  <h2
                    className="font-bold uppercase tracking-widest opacity-80 flex items-center gap-2"
                    style={{ fontSize: "clamp(0.75rem, 4cqmin, 1.125rem)" }}
                  >
                    <Clock style={{ width: "1em", height: "1em" }} className="text-primary" />
                    Histórico
                  </h2>
                </div>
                
                <div
                  className="flex-1 overflow-hidden"
                  style={{
                    padding: "clamp(0.25rem, 1.5cqmin, 0.5rem)",
                    display: "grid",
                    gridTemplateRows: `repeat(${Math.max(historico.length, 1)}, minmax(0, 1fr))`,
                    gap: "clamp(0.25rem, 1.5cqmin, 0.5rem)",
                  }}
                >
                  {historico.length > 0 ? (
                    historico.map((chamada, hIdx) => (
                      <div 
                        key={chamada.id}
                        className="@container flex items-center justify-between rounded-xl border border-white/5 bg-white/5 animate-in slide-in-from-right duration-300 min-h-0 overflow-hidden"
                        style={{
                          animationDelay: `${hIdx * 100}ms`,
                          paddingInline: "clamp(0.5rem, 3cqmin, 1rem)",
                          paddingBlock: "clamp(0.25rem, 2cqmin, 0.625rem)",
                          gap: "clamp(0.5rem, 3cqmin, 1rem)",
                          containerType: "inline-size",
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <p
                            className="font-bold text-primary leading-tight truncate"
                            style={{ fontSize: "clamp(0.875rem, 7cqi, 1.5rem)" }}
                          >
                            {chamada.senha?.codigo}
                          </p>
                          <p
                            className="font-medium opacity-50 uppercase truncate leading-snug"
                            style={{ fontSize: "clamp(0.5rem, 2.5cqi, 0.75rem)" }}
                          >
                            {chamada.senha?.paciente_nome ? `${chamada.senha.paciente_nome} • ` : ""}
                            {chamada.senha?.fila_nome || "Geral"}
                          </p>
                          {(() => {
                            const sid = chamada.senha?.id;
                            const st = sid ? statusSenhas[sid] : undefined;
                            const lbl = statusLabel(st);
                            if (!lbl) return null;
                            return (
                              <span
                                className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 font-bold uppercase tracking-wider ${lbl.cls}`}
                                style={{ fontSize: "clamp(0.4375rem, 2cqi, 0.6875rem)" }}
                              >
                                {lbl.label}
                              </span>
                            );
                          })()}
                        </div>
                        <div className="text-right shrink-0 min-w-0 max-w-[55%]">
                          <p
                            className="font-bold opacity-90 leading-tight truncate"
                            style={{ fontSize: "clamp(0.6875rem, 4.5cqi, 1rem)" }}
                            title={limparDestino(chamada.destino)}
                          >
                            {limparDestino(chamada.destino)}
                          </p>
                          <p
                            className="font-mono opacity-30"
                            style={{ fontSize: "clamp(0.5rem, 2.2cqi, 0.6875rem)" }}
                          >
                            {new Date(chamada.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex h-full items-center justify-center opacity-20 italic" style={{ fontSize: "clamp(0.75rem, 3cqmin, 1rem)" }}>
                      Nenhum histórico
                    </div>
                  )}
                </div>
              </div>
            );
          }

          if (item.type === "midia") {
            return (
              <div 
                key={`item-${idx}`}
                className="overflow-hidden rounded-2xl border border-white/10"
                style={{
                  gridColumn: `span ${item.col_span}`,
                  gridRow: `span ${item.row_span}`,
                }}
              >
                <TvCarrossel 
                  unidadeId={unidade.id} 
                  minimalChrome 
                  paused={isSpeakingState}
                  className="h-full border-0 rounded-none" 
                />
              </div>
            );
          }

          if (item.type === "relogio") {
            return (
              <div 
                key={`item-${idx}`}
                className="flex flex-col items-center justify-center border border-white/10 bg-black/20 backdrop-blur-md rounded-2xl p-6"
                style={{
                  gridColumn: `span ${item.col_span}`,
                  gridRow: `span ${item.row_span}`,
                }}
              >
                <p className="text-[6rem] font-mono font-bold leading-none">
                  {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
                <p className="text-2xl font-medium opacity-60 mt-2">
                  {now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                </p>
              </div>
            );
          }

          return null;
        })}
      </main>

      {/* Footer / Scrolling News or Info */}
      <footer 
        className="relative flex items-center bg-primary px-10 text-primary-foreground font-bold overflow-hidden whitespace-nowrap"
        style={{ 
          height: `${4 * (visual.escala_rodape ?? 1)}rem`,
          fontSize: `${1.125 * (visual.escala_rodape ?? 1)}rem`
        }}
      >
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

      <TvZoomControl
        zoom={zoom}
        onInc={() => updateZoom(zoom + 0.05)}
        onDec={() => updateZoom(zoom - 0.05)}
        onReset={() => updateZoom(visual.zoom_nivel || 1)}
        safeArea={safeArea}
        onSafeAreaChange={updateSafeArea}
        aspectRatio={visual.aspect_ratio}
        onAspectRatioChange={async (ratio) => {
          // Atualiza o estado visual IMEDIATAMENTE (localmente)
          setConfig(prev => ({ ...prev, aspect_ratio: ratio }));
          
          // Tenta persistir no banco se for admin, mas aqui na TV é mais pra ajuste local rápido
          // Como o useTvVisualConfig assina realtime, se mudarmos no banco muda em todas as TVs.
          // Se o usuário quer mudar SÓ NESTA TV, talvez precisássemos de um state local.
          // O pedido fala em "selecionar o formato", então vou persistir pra ser o padrão da unidade.
          try {
            await supabase
              .from("tv_visual_config")
              .update({ aspect_ratio: ratio } as any)
              .eq("unidade_id", unidade.id);
          } catch (e) {
            console.error("Erro ao salvar ratio:", e);
          }
        }}
        autoHide
      />
    </div>
  );
}

