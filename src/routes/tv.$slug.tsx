import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Clock, Loader2, Megaphone, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Unidade = { id: string; nome: string; slug: string };
type Fila = { id: string; nome: string; prefixo_senha: string; cor: string | null; ordem: number };
type SenhaPrioridade = "normal" | "preferencial" | "urgente";
type SenhaStatus = "aguardando" | "chamada" | "em_atendimento" | "finalizada" | "ausente" | "cancelada";
type Senha = {
  id: string;
  codigo: string;
  fila_id: string;
  status: SenhaStatus;
  prioridade: SenhaPrioridade;
  updated_at: string;
  created_at: string;
};
type Chamada = {
  id: string;
  senha_id: string;
  destino: string;
  created_at: string;
};

export const Route = createFileRoute("/tv/$slug")({
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
  const [unidade, setUnidade] = useState<Unidade | null>(null);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [senhas, setSenhas] = useState<Senha[]>([]);
  const [chamadas, setChamadas] = useState<Chamada[]>([]);
  const [now, setNow] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(false);

  // Carregamento inicial
  useEffect(() => {
    let mounted = true;
    void (async () => {
      const { data: uni, error: uniErr } = await supabase
        .from("unidades")
        .select("id,nome,slug")
        .eq("slug", slug)
        .eq("ativo", true)
        .maybeSingle();
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
        supabase
          .from("senhas")
          .select("id,codigo,fila_id,status,prioridade,updated_at,created_at")
          .eq("unidade_id", uni.id)
          .in("status", ["aguardando", "chamada", "em_atendimento"])
          .order("created_at"),
        supabase
          .from("chamadas")
          .select("id,senha_id,destino,created_at")
          .eq("unidade_id", uni.id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      if (!mounted) return;
      setFilas((filasRes.data ?? []) as Fila[]);
      setSenhas((senhasRes.data ?? []) as Senha[]);
      setChamadas((chamadasRes.data ?? []) as Chamada[]);
    })();
    return () => {
      mounted = false;
    };
  }, [slug]);

  // Realtime — escuta senhas e chamadas da unidade
  useEffect(() => {
    if (!unidade) return;
    const channel = supabase
      .channel(`tv-${unidade.id}`)
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
              const next = prev.map((s) => (s.id === updated.id ? updated : s));
              return next.filter((s) =>
                ["aguardando", "chamada", "em_atendimento"].includes(s.status),
              );
            }
            if (payload.eventType === "DELETE") {
              const old = payload.old as { id: string };
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
          setChamadas((prev) => [nova, ...prev].slice(0, 10));
          if (soundOnRef.current) {
            playDing();
            // Aguarda um instante após o ding e fala a chamada
            void announceChamada(nova);
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [unidade]);

  // Relógio
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Som
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundOnRef = useRef(false);
  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);
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
    // gesto do usuário desbloqueia AudioContext
    playDing();
    // Também "aquece" a Web Speech API com uma fala silenciosa
    primeSpeech();
  };

  // ── Voz: Web Speech API ────────────────────────────────
  const pacienteCacheRef = useRef<Map<string, string>>(new Map());
  const senhasMapRef = useRef(new Map<string, Senha>());
  useEffect(() => {
    senhasMapRef.current = new Map(senhas.map((s) => [s.id, s]));
  }, [senhas]);

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

  const speak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      const synth = window.speechSynthesis;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "pt-BR";
      u.rate = 0.95;
      u.pitch = 1;
      u.volume = 1;
      const voices = synth.getVoices();
      const ptVoice =
        voices.find((v) => v.lang === "pt-BR") ??
        voices.find((v) => v.lang?.startsWith("pt"));
      if (ptVoice) u.voice = ptVoice;
      synth.speak(u);
    } catch {
      /* ignora */
    }
  };

  const announceChamada = async (chamada: Chamada) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const senha = senhasMapRef.current.get(chamada.senha_id);

    // Pequeno delay para o "ding" terminar antes da fala
    await new Promise((r) => setTimeout(r, 700));

    // Resolve o nome do paciente (cache → fetch)
    let nome: string | null = null;
    if (pacienteCacheRef.current.has(chamada.senha_id)) {
      const cached = pacienteCacheRef.current.get(chamada.senha_id);
      nome = cached && cached.length > 0 ? cached : null;
    } else {
      try {
        const { data } = await supabase
          .from("senhas")
          .select("codigo, pacientes(nome_completo)")
          .eq("id", chamada.senha_id)
          .maybeSingle();
        const raw = (data as { pacientes: { nome_completo: string } | null } | null)
          ?.pacientes?.nome_completo;
        nome = raw ? primeiroEUltimoNome(raw) : null;
        pacienteCacheRef.current.set(chamada.senha_id, nome ?? "");
      } catch {
        nome = null;
      }
    }

    const codigo = senha?.codigo ?? "";
    const codigoFalado = codigo ? soletrarCodigo(codigo) : "";
    const partes = [
      nome ? `${nome},` : null,
      codigoFalado ? `senha ${codigoFalado},` : null,
      `dirija-se ${formatarDestino(chamada.destino)}`,
    ].filter(Boolean);
    speak(partes.join(" "));
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
      {/* Header */}
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
            <button
              onClick={soundOn ? () => setSoundOn(false) : handleEnableSound}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 transition-colors"
              title={soundOn ? "Desativar som" : "Ativar som"}
            >
              {soundOn ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4 text-slate-400" />}
              <span className="hidden sm:inline">{soundOn ? "Som ativo" : "Ativar som"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="mx-auto max-w-[1600px] grid gap-6 px-8 py-8 lg:grid-cols-[1.5fr_1fr]">
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
                {ultimasChamadas.map(({ chamada, senha }) => (
                  <li
                    key={chamada.id}
                    className="rounded-2xl border border-white/10 bg-slate-800/60 p-4 text-center"
                  >
                    <div className="font-display text-3xl font-bold tabular-nums">{senha.codigo}</div>
                    <div className="mt-1 text-xs text-slate-400 truncate">{chamada.destino}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
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
