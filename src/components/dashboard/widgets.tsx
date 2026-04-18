import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Ticket,
  Clock,
  Users,
  ListOrdered,
  Stethoscope,
  Activity,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Loader2,
  Megaphone,
  Play,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";

/* ──────────────────────────────────────────────────────────
 * Helpers compartilhados
 * ────────────────────────────────────────────────────────── */

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  loading,
  accent = "primary",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  hint?: string;
  loading?: boolean;
  accent?: "primary" | "success" | "warning" | "danger";
}) {
  const accentBg = {
    primary: "bg-gradient-primary shadow-glow",
    success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    danger: "bg-destructive/15 text-destructive",
  }[accent];

  const iconColor = accent === "primary" ? "text-primary-foreground" : "";

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elegant">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accentBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div className="mt-5 font-display text-3xl font-bold">
        {loading ? <Skeleton className="h-8 w-16" /> : value}
      </div>
      <div className="mt-1 font-medium">{label}</div>
      {hint && <div className="text-sm text-muted-foreground">{hint}</div>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-xl font-semibold tracking-tight">{children}</h2>
  );
}

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * AudioContext singleton — criado uma única vez e desbloqueado no primeiro
 * gesto do usuário (clique/tecla/toque). Browsers exigem que o AudioContext
 * seja iniciado dentro de um event handler de gesto, senão o estado fica "suspended".
 */
let _audioCtx: AudioContext | null = null;
let _audioUnlockBound = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (_audioCtx) return _audioCtx;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  try {
    _audioCtx = new AudioCtx();
  } catch {
    return null;
  }
  return _audioCtx;
}

/**
 * Registra listeners "once" que destravam o AudioContext na primeira interação.
 * Idempotente — pode ser chamado várias vezes.
 */
function ensureAudioUnlock() {
  if (typeof window === "undefined" || _audioUnlockBound) return;
  _audioUnlockBound = true;

  const unlock = () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    // Toca um buffer silencioso para "armar" o pipeline em iOS/Safari
    try {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.start(0);
    } catch {
      // ignora
    }
  };

  const opts: AddEventListenerOptions = { once: true, capture: true };
  window.addEventListener("pointerdown", unlock, opts);
  window.addEventListener("keydown", unlock, opts);
  window.addEventListener("touchstart", unlock, opts);
}

/**
 * Toca um "ding-dong" curto usando o AudioContext persistente.
 * Se o contexto ainda estiver suspenso (sem gesto do usuário), tenta resumir
 * — o browser pode silenciar, mas as próximas tocadas funcionarão.
 */
function playUrgenteAlert() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => {});
  }
  try {
    const now = ctx.currentTime;
    const beep = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + start);
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.35, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + duration + 0.02);
    };
    beep(880, 0, 0.18);
    beep(1175, 0.2, 0.22);
  } catch {
    // ignora
  }
}

/* ──────────────────────────────────────────────────────────
 * RECEPÇÃO — senhas geradas hoje, por fila, últimas geradas
 * ────────────────────────────────────────────────────────── */

export function RecepcaoWidgets({ unidadeId }: { unidadeId: string }) {
  const [loading, setLoading] = useState(true);
  const [totalHoje, setTotalHoje] = useState(0);
  const [aguardando, setAguardando] = useState(0);
  const [prioridade, setPrioridade] = useState(0);
  const [porFila, setPorFila] = useState<{ nome: string; cor: string | null; total: number }[]>([]);
  const [ultimas, setUltimas] = useState<
    { id: string; codigo: string; created_at: string; status: string; prioridade: string }[]
  >([]);

  useEffect(() => {
    let cancel = false;
    const load = async () => {
      setLoading(true);
      const inicio = startOfTodayISO();

      const [hojeRes, aguardRes, prioRes, filasRes, ultimasRes] = await Promise.all([
        supabase
          .from("senhas")
          .select("id", { count: "exact", head: true })
          .eq("unidade_id", unidadeId)
          .gte("created_at", inicio),
        supabase
          .from("senhas")
          .select("id", { count: "exact", head: true })
          .eq("unidade_id", unidadeId)
          .eq("status", "aguardando"),
        supabase
          .from("senhas")
          .select("id", { count: "exact", head: true })
          .eq("unidade_id", unidadeId)
          .gte("created_at", inicio)
          .in("prioridade", ["preferencial", "urgente"]),
        supabase
          .from("senhas")
          .select("fila_id, filas!inner(nome,cor)")
          .eq("unidade_id", unidadeId)
          .gte("created_at", inicio),
        supabase
          .from("senhas")
          .select("id,codigo,created_at,status,prioridade")
          .eq("unidade_id", unidadeId)
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      if (cancel) return;

      setTotalHoje(hojeRes.count ?? 0);
      setAguardando(aguardRes.count ?? 0);
      setPrioridade(prioRes.count ?? 0);

      const grouped = new Map<string, { nome: string; cor: string | null; total: number }>();
      for (const row of (filasRes.data ?? []) as Array<{
        fila_id: string;
        filas: { nome: string; cor: string | null };
      }>) {
        const key = row.fila_id;
        const cur = grouped.get(key);
        if (cur) cur.total += 1;
        else grouped.set(key, { nome: row.filas.nome, cor: row.filas.cor, total: 1 });
      }
      setPorFila(Array.from(grouped.values()).sort((a, b) => b.total - a.total));
      setUltimas((ultimasRes.data ?? []) as typeof ultimas);
      setLoading(false);
    };
    void load();
    return () => {
      cancel = true;
    };
  }, [unidadeId]);

  return (
    <div className="space-y-8">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Ticket} label="Senhas geradas hoje" value={totalHoje} loading={loading} />
        <StatCard
          icon={Clock}
          label="Aguardando agora"
          value={aguardando}
          hint="Em qualquer fila"
          loading={loading}
          accent="warning"
        />
        <StatCard
          icon={AlertCircle}
          label="Prioridade hoje"
          value={prioridade}
          hint="Preferencial + urgente"
          loading={loading}
          accent="danger"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <SectionTitle>Distribuição por fila (hoje)</SectionTitle>
            <Link to="/app/filas" className="text-sm text-primary inline-flex items-center gap-1 hover:underline">
              Ver filas <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {loading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />)
            ) : porFila.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma senha gerada ainda hoje.</p>
            ) : (
              porFila.map((f) => {
                const max = Math.max(...porFila.map((x) => x.total));
                const pct = max ? (f.total / max) * 100 : 0;
                return (
                  <div key={f.nome}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{f.nome}</span>
                      <span className="tabular-nums text-muted-foreground">{f.total}</span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: f.cor ?? "hsl(var(--primary))",
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <SectionTitle>Últimas senhas geradas</SectionTitle>
            <Link to="/app/recepcao" className="text-sm text-primary inline-flex items-center gap-1 hover:underline">
              Gerar senha <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-5 space-y-2">
            {loading ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : ultimas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma senha registrada.</p>
            ) : (
              ultimas.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm">{s.codigo}</span>
                    {s.prioridade !== "normal" && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {s.prioridade}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground capitalize">{s.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 * MEDICO / ENFERMEIRO — fila de atendimento
 * ────────────────────────────────────────────────────────── */

type SenhaStatus = "aguardando" | "chamada" | "em_atendimento" | "finalizada" | "ausente" | "cancelada";

type ProximaSenha = {
  id: string;
  codigo: string;
  prioridade: string;
  status: SenhaStatus;
  created_at: string;
  updated_at: string;
  fila_id: string;
  paciente_id: string | null;
  filas: { nome: string; cor: string | null } | null;
  pacientes: { nome_completo: string } | null;
};

function primeiroEUltimoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length <= 2) return nome.trim();
  return `${partes[0]} ${partes[partes.length - 1]}`;
}

const PRIO_RANK: Record<string, number> = { urgente: 0, preferencial: 1, normal: 2 };

function sortSenhas(list: ProximaSenha[]): ProximaSenha[] {
  // chamadas primeiro, depois aguardando por prioridade + ordem de chegada
  return [...list].sort((a, b) => {
    if (a.status !== b.status) {
      if (a.status === "chamada") return -1;
      if (b.status === "chamada") return 1;
    }
    const r = (PRIO_RANK[a.prioridade] ?? 9) - (PRIO_RANK[b.prioridade] ?? 9);
    if (r !== 0) return r;
    return a.created_at.localeCompare(b.created_at);
  });
}

type AtendimentoAtivo = {
  id: string;
  iniciado_em: string;
  senha_id: string;
  paciente_id: string | null;
  codigo: string;
  paciente_nome: string | null;
  fila_nome: string | null;
};

export function AtendimentoWidgets({ unidadeId }: { unidadeId: string }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [aguardando, setAguardando] = useState(0);
  const [chamadas, setChamadas] = useState(0);
  const [emAtendimento, setEmAtendimento] = useState(0);
  const [proximas, setProximas] = useState<ProximaSenha[]>([]);
  const [atendimentoAtivo, setAtendimentoAtivo] = useState<AtendimentoAtivo | null>(null);
  const temAtivo = atendimentoAtivo !== null;

  // Modal de chamada
  const [chamarSenha, setChamarSenha] = useState<ProximaSenha | null>(null);
  const [destino, setDestino] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Loading por linha (Chamar / Iniciar)
  const [actionId, setActionId] = useState<string | null>(null);

  // Finalizar atendimento ativo
  const [finalizando, setFinalizando] = useState(false);
  const [minimizado, setMinimizado] = useState(false);

  // IDs de senhas urgentes já vistas — para tocar o alerta apenas em entradas novas
  const urgentesVistasRef = useRef<Set<string>>(new Set());
  const primeiroLoadRef = useRef(true);

  // Destrava o AudioContext na primeira interação do usuário (clique/tecla/toque)
  // para que os alertas sonoros funcionem mesmo sem interação prévia com o dashboard.
  useEffect(() => {
    ensureAudioUnlock();
  }, []);
  // Tick para o timer ao vivo
  const [, setNowTick] = useState(0);
  useEffect(() => {
    if (!atendimentoAtivo) return;
    const t = setInterval(() => setNowTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [atendimentoAtivo]);

  useEffect(() => {
    let cancel = false;

    const load = async () => {
      setLoading(true);
      const [agRes, chRes, emRes, proxRes, ativoRes] = await Promise.all([
        supabase
          .from("senhas")
          .select("id", { count: "exact", head: true })
          .eq("unidade_id", unidadeId)
          .eq("status", "aguardando"),
        supabase
          .from("senhas")
          .select("id", { count: "exact", head: true })
          .eq("unidade_id", unidadeId)
          .eq("status", "chamada"),
        supabase
          .from("senhas")
          .select("id", { count: "exact", head: true })
          .eq("unidade_id", unidadeId)
          .eq("status", "em_atendimento"),
        supabase
          .from("senhas")
          .select("id,codigo,prioridade,status,created_at,updated_at,fila_id,paciente_id,filas(nome,cor),pacientes(nome_completo)")
          .eq("unidade_id", unidadeId)
          .in("status", ["aguardando", "chamada"])
          .order("prioridade", { ascending: false })
          .order("created_at", { ascending: true })
          .limit(10),
        user
          ? supabase
              .from("atendimentos")
              .select(
                "id,iniciado_em,senha_id,paciente_id,senhas!inner(codigo,filas(nome)),pacientes(nome_completo)",
              )
              .eq("unidade_id", unidadeId)
              .eq("profissional_id", user.id)
              .is("finalizado_em", null)
              .order("iniciado_em", { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (cancel) return;
      setAguardando(agRes.count ?? 0);
      setChamadas(chRes.count ?? 0);
      setEmAtendimento(emRes.count ?? 0);
      const proximasOrdenadas = sortSenhas((proxRes.data ?? []) as ProximaSenha[]);
      // Inicializa o conjunto de "vistas" com as urgentes ativas no primeiro load — sem tocar som
      for (const p of proximasOrdenadas) {
        if (p.prioridade === "urgente") urgentesVistasRef.current.add(p.id);
      }
      primeiroLoadRef.current = false;
      setProximas(proximasOrdenadas);
      const ativoData = (ativoRes as {
        data:
          | {
              id: string;
              iniciado_em: string;
              senha_id: string;
              paciente_id: string | null;
              senhas: { codigo: string; filas: { nome: string } | null } | null;
              pacientes: { nome_completo: string } | null;
            }
          | null;
      }).data;
      setAtendimentoAtivo(
        ativoData
          ? {
              id: ativoData.id,
              iniciado_em: ativoData.iniciado_em,
              senha_id: ativoData.senha_id,
              paciente_id: ativoData.paciente_id,
              codigo: ativoData.senhas?.codigo ?? "—",
              paciente_nome: ativoData.pacientes?.nome_completo ?? null,
              fila_nome: ativoData.senhas?.filas?.nome ?? null,
            }
          : null,
      );
      setLoading(false);
    };

    void load();
    return () => {
      cancel = true;
    };
  }, [unidadeId, user]);

  // Realtime — atualiza lista e contadores quando senhas mudam
  useEffect(() => {
    const ch = supabase
      .channel(`dashboard-atendimento-${unidadeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "senhas",
          filter: `unidade_id=eq.${unidadeId}`,
        },
        async (payload) => {
          // Recalcula contadores quando algum status muda
          const recountStatuses = async () => {
            const [a, c, e] = await Promise.all([
              supabase
                .from("senhas")
                .select("id", { count: "exact", head: true })
                .eq("unidade_id", unidadeId)
                .eq("status", "aguardando"),
              supabase
                .from("senhas")
                .select("id", { count: "exact", head: true })
                .eq("unidade_id", unidadeId)
                .eq("status", "chamada"),
              supabase
                .from("senhas")
                .select("id", { count: "exact", head: true })
                .eq("unidade_id", unidadeId)
                .eq("status", "em_atendimento"),
            ]);
            setAguardando(a.count ?? 0);
            setChamadas(c.count ?? 0);
            setEmAtendimento(e.count ?? 0);
          };

          if (payload.eventType === "DELETE") {
            const old = payload.old as { id: string };
            urgentesVistasRef.current.delete(old.id);
            setProximas((prev) => prev.filter((p) => p.id !== old.id));
            await recountStatuses();
            return;
          }

          const row = payload.new as Omit<ProximaSenha, "filas"> & { filas?: never };
          const ativa = ["aguardando", "chamada"].includes(row.status);

          // 🔔 Alerta sonoro: nova senha urgente que ainda não vimos
          if (
            ativa &&
            row.prioridade === "urgente" &&
            !urgentesVistasRef.current.has(row.id)
          ) {
            urgentesVistasRef.current.add(row.id);
            playUrgenteAlert();
            toast.warning(`Senha urgente: ${row.codigo}`, {
              description: "Nova prioridade urgente entrou na fila.",
            });
          }

          if (!ativa) {
            // saiu da nossa lista (em_atendimento, finalizada, etc.)
            setProximas((prev) => prev.filter((p) => p.id !== row.id));
            await recountStatuses();
            return;
          }

          // Buscar fila e paciente em paralelo para enriquecer
          const [filaRes, pacRes] = await Promise.all([
            supabase.from("filas").select("nome,cor").eq("id", row.fila_id).maybeSingle(),
            row.paciente_id
              ? supabase
                  .from("pacientes")
                  .select("nome_completo")
                  .eq("id", row.paciente_id)
                  .maybeSingle()
              : Promise.resolve({ data: null }),
          ]);

          const enriched: ProximaSenha = {
            ...row,
            filas: filaRes.data ?? null,
            pacientes: pacRes.data ?? null,
          };

          setProximas((prev) => {
            const exists = prev.some((p) => p.id === row.id);
            const next = exists
              ? prev.map((p) => (p.id === row.id ? enriched : p))
              : [...prev, enriched];
            return sortSenhas(next).slice(0, 10);
          });
          await recountStatuses();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "atendimentos",
          filter: `unidade_id=eq.${unidadeId}`,
        },
        async () => {
          if (!user) return;
          const { data } = await supabase
            .from("atendimentos")
            .select(
              "id,iniciado_em,senha_id,paciente_id,senhas!inner(codigo,filas(nome)),pacientes(nome_completo)",
            )
            .eq("unidade_id", unidadeId)
            .eq("profissional_id", user.id)
            .is("finalizado_em", null)
            .order("iniciado_em", { ascending: false })
            .limit(1)
            .maybeSingle();
          setAtendimentoAtivo(
            data
              ? {
                  id: data.id,
                  iniciado_em: data.iniciado_em,
                  senha_id: data.senha_id,
                  paciente_id: data.paciente_id,
                  codigo: data.senhas?.codigo ?? "—",
                  paciente_nome: data.pacientes?.nome_completo ?? null,
                  fila_nome: data.senhas?.filas?.nome ?? null,
                }
              : null,
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [unidadeId, user]);

  const abrirChamar = (s: ProximaSenha) => {
    if (temAtivo) {
      toast.error("Finalize o atendimento atual antes de chamar outra senha.");
      return;
    }
    setChamarSenha(s);
    setDestino(s.filas?.nome ? `${s.filas.nome} 1` : "");
  };

  const confirmarChamar = async () => {
    if (!chamarSenha || !user) return;
    if (!destino.trim()) {
      toast.error("Informe o destino (consultório, sala, guichê...).");
      return;
    }
    setSubmitting(true);
    try {
      const agora = new Date().toISOString();
      const { error: e1 } = await supabase
        .from("senhas")
        .update({ status: "chamada", updated_at: agora })
        .eq("id", chamarSenha.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("chamadas").insert({
        unidade_id: unidadeId,
        senha_id: chamarSenha.id,
        destino: destino.trim(),
        chamado_por: user.id,
      });
      if (e2) throw e2;
      toast.success(`${chamarSenha.codigo} chamada para ${destino.trim()}.`);
      // Atualização otimista local (realtime sincroniza outras abas)
      setProximas((prev) =>
        sortSenhas(
          prev.map((p) =>
            p.id === chamarSenha.id ? { ...p, status: "chamada", updated_at: agora } : p,
          ),
        ),
      );
      setAguardando((n) => Math.max(0, n - 1));
      setChamadas((n) => n + 1);
      setChamarSenha(null);
      setDestino("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao chamar senha.");
    } finally {
      setSubmitting(false);
    }
  };

  const iniciarAtendimento = async (s: ProximaSenha) => {
    if (!user) return;
    if (temAtivo) {
      toast.error("Já existe um atendimento em andamento.");
      return;
    }
    setActionId(s.id);
    try {
      const { data: novo, error: e1 } = await supabase
        .from("atendimentos")
        .insert({
          unidade_id: unidadeId,
          senha_id: s.id,
          paciente_id: s.paciente_id,
          profissional_id: user.id,
        })
        .select("id,iniciado_em")
        .maybeSingle();
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("senhas")
        .update({ status: "em_atendimento", updated_at: new Date().toISOString() })
        .eq("id", s.id);
      if (e2) throw e2;
      toast.success(`${s.codigo} — atendimento iniciado.`);
      // Atualização otimista local
      setProximas((prev) => prev.filter((p) => p.id !== s.id));
      setChamadas((n) => Math.max(0, n - 1));
      setEmAtendimento((n) => n + 1);
      if (novo) {
        setAtendimentoAtivo({
          id: novo.id,
          iniciado_em: novo.iniciado_em,
          senha_id: s.id,
          paciente_id: s.paciente_id,
          codigo: s.codigo,
          paciente_nome: s.pacientes?.nome_completo ?? null,
          fila_nome: s.filas?.nome ?? null,
        });
        setMinimizado(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao iniciar atendimento.");
    } finally {
      setActionId(null);
    }
  };

  const finalizarAtendimento = async () => {
    if (!atendimentoAtivo) return;
    setFinalizando(true);
    try {
      const agora = new Date();
      const dur = Math.max(
        0,
        Math.floor((agora.getTime() - new Date(atendimentoAtivo.iniciado_em).getTime()) / 1000),
      );
      const { error: e1 } = await supabase
        .from("atendimentos")
        .update({ finalizado_em: agora.toISOString(), duracao_segundos: dur })
        .eq("id", atendimentoAtivo.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("senhas")
        .update({
          status: "finalizada",
          finalizada_em: agora.toISOString(),
          updated_at: agora.toISOString(),
        })
        .eq("id", atendimentoAtivo.senha_id);
      if (e2) throw e2;
      toast.success(`${atendimentoAtivo.codigo} — atendimento finalizado.`);
      setAtendimentoAtivo(null);
      setEmAtendimento((n) => Math.max(0, n - 1));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao finalizar atendimento.");
    } finally {
      setFinalizando(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-5 sm:grid-cols-3">
        <StatCard
          icon={Clock}
          label="Aguardando"
          value={aguardando}
          loading={loading}
          accent="warning"
        />
        <StatCard
          icon={Activity}
          label="Chamadas em curso"
          value={chamadas}
          loading={loading}
        />
        <StatCard
          icon={Stethoscope}
          label="Em atendimento"
          value={emAtendimento}
          loading={loading}
          accent="success"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <SectionTitle>Próximos pacientes na fila</SectionTitle>
            {temAtivo && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Você tem um atendimento ativo. Finalize-o para chamar/iniciar outro.
              </p>
            )}
          </div>
          <Link
            to="/app/atendimento"
            className="text-sm text-primary inline-flex items-center gap-1 hover:underline"
          >
            Ir para atendimento <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {loading ? (
            [...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
          ) : proximas.length === 0 ? (
            <p className="text-sm text-muted-foreground sm:col-span-2">
              Nenhum paciente aguardando no momento.
            </p>
          ) : (
            proximas.map((s) => {
              const wait = Math.max(
                0,
                Math.floor((Date.now() - new Date(s.created_at).getTime()) / 60000),
              );
              const isChamada = s.status === "chamada";
              return (
                <div
                  key={s.id}
                  className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors ${
                    isChamada
                      ? "border-amber-500/40 bg-amber-500/5"
                      : "border-border bg-muted/30"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="h-10 w-1 rounded-full shrink-0"
                      style={{ backgroundColor: s.filas?.cor ?? "hsl(var(--primary))" }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-base font-bold">{s.codigo}</span>
                        {s.pacientes?.nome_completo && (
                          <span className="text-sm font-medium text-foreground/80 truncate max-w-[14rem]">
                            {primeiroEUltimoNome(s.pacientes.nome_completo)}
                          </span>
                        )}
                        {isChamada && (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-0 text-[10px] py-0 px-1.5">
                            Chamada
                          </Badge>
                        )}
                        {s.prioridade !== "normal" && (
                          <Badge variant="outline" className="capitalize text-[10px] py-0 px-1.5">
                            {s.prioridade}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {s.filas?.nome ?? "—"} · {wait} min
                        {!s.pacientes?.nome_completo && " · sem paciente vinculado"}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {isChamada ? (
                      <Button
                        size="sm"
                        onClick={() => void iniciarAtendimento(s)}
                        disabled={actionId === s.id || temAtivo}
                        className="bg-gradient-primary"
                      >
                        {actionId === s.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Play className="h-3.5 w-3.5" />
                        )}
                        Iniciar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => abrirChamar(s)}
                        disabled={temAtivo}
                        className="bg-gradient-primary"
                      >
                        <Megaphone className="h-3.5 w-3.5" />
                        Chamar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <Dialog
        open={!!chamarSenha}
        onOpenChange={(o) => {
          if (!o) {
            setChamarSenha(null);
            setDestino("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">
              Chamar senha{" "}
              <span className="font-mono text-primary">{chamarSenha?.codigo}</span>
            </DialogTitle>
            <DialogDescription>
              {chamarSenha?.filas?.nome ?? "Fila"} — informe para onde o paciente deve se dirigir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="destino-dashboard">Destino</Label>
            <Input
              id="destino-dashboard"
              autoFocus
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              placeholder="Consultório 1, Sala 3, Guichê A..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !submitting) void confirmarChamar();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChamarSenha(null)} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              onClick={() => void confirmarChamar()}
              disabled={submitting || !destino.trim()}
              className="bg-gradient-primary"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Megaphone className="h-4 w-4" />
              )}
              Chamar agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Card flutuante de Atendimento ativo */}
      {atendimentoAtivo && (
        <div
          className="fixed bottom-4 right-4 z-50 w-[20rem] max-w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-bottom-4 duration-300"
          role="region"
          aria-label="Atendimento ativo"
        >
          <div className="rounded-2xl border-2 border-primary/40 bg-card shadow-elegant overflow-hidden">
            {/* Cabeçalho sempre visível */}
            <button
              type="button"
              onClick={() => setMinimizado((m) => !m)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-gradient-primary text-primary-foreground"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Em atendimento
                </span>
                <span className="font-mono text-sm font-bold truncate">
                  · {atendimentoAtivo.codigo}
                </span>
              </div>
              {minimizado ? (
                <ChevronUp className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0" />
              )}
            </button>

            {!minimizado && (
              <div className="p-4 space-y-4">
                {/* Paciente */}
                <div className="flex items-start gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">
                      {atendimentoAtivo.paciente_nome ?? "Paciente não identificado"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {atendimentoAtivo.fila_nome ?? "—"}
                    </div>
                  </div>
                </div>

                {/* Timer */}
                <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-center">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                    Tempo decorrido
                  </div>
                  <div className="mt-1 font-mono text-3xl font-bold tabular-nums text-foreground">
                    {(() => {
                      const sec = Math.max(
                        0,
                        Math.floor(
                          (Date.now() - new Date(atendimentoAtivo.iniciado_em).getTime()) / 1000,
                        ),
                      );
                      const h = Math.floor(sec / 3600);
                      const m = Math.floor((sec % 3600) / 60);
                      const s = sec % 60;
                      const pad = (n: number) => n.toString().padStart(2, "0");
                      return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
                    })()}
                  </div>
                </div>

                {/* Ação */}
                <Button
                  onClick={() => void finalizarAtendimento()}
                  disabled={finalizando}
                  className="w-full bg-gradient-primary"
                  size="lg"
                >
                  {finalizando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Finalizar atendimento
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 * GESTOR — KPIs gerenciais
 * ────────────────────────────────────────────────────────── */

export function GestorWidgets({ unidadeId }: { unidadeId: string }) {
  const [loading, setLoading] = useState(true);
  const [senhasHoje, setSenhasHoje] = useState(0);
  const [finalizadasHoje, setFinalizadasHoje] = useState(0);
  const [tempoMedioMin, setTempoMedioMin] = useState<number | null>(null);
  const [pacientes, setPacientes] = useState(0);
  const [filasAtivas, setFilasAtivas] = useState(0);
  const [taxaConclusao, setTaxaConclusao] = useState(0);

  useEffect(() => {
    let cancel = false;
    const load = async () => {
      setLoading(true);
      const inicio = startOfTodayISO();

      const [senhasRes, finalRes, atendRes, pacRes, filasRes] = await Promise.all([
        supabase
          .from("senhas")
          .select("id", { count: "exact", head: true })
          .eq("unidade_id", unidadeId)
          .gte("created_at", inicio),
        supabase
          .from("senhas")
          .select("id", { count: "exact", head: true })
          .eq("unidade_id", unidadeId)
          .eq("status", "finalizada")
          .gte("created_at", inicio),
        supabase
          .from("atendimentos")
          .select("duracao_segundos")
          .eq("unidade_id", unidadeId)
          .not("duracao_segundos", "is", null)
          .gte("iniciado_em", inicio),
        supabase
          .from("pacientes")
          .select("id", { count: "exact", head: true })
          .eq("unidade_id", unidadeId),
        supabase
          .from("filas")
          .select("id", { count: "exact", head: true })
          .eq("unidade_id", unidadeId)
          .eq("ativa", true),
      ]);

      if (cancel) return;

      const total = senhasRes.count ?? 0;
      const fin = finalRes.count ?? 0;
      setSenhasHoje(total);
      setFinalizadasHoje(fin);
      setTaxaConclusao(total ? Math.round((fin / total) * 100) : 0);

      const durs = ((atendRes.data ?? []) as { duracao_segundos: number | null }[])
        .map((r) => r.duracao_segundos ?? 0)
        .filter((n) => n > 0);
      setTempoMedioMin(
        durs.length ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length / 60) : null,
      );
      setPacientes(pacRes.count ?? 0);
      setFilasAtivas(filasRes.count ?? 0);
      setLoading(false);
    };
    void load();
    return () => {
      cancel = true;
    };
  }, [unidadeId]);

  return (
    <div className="space-y-8">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Ticket} label="Senhas hoje" value={senhasHoje} loading={loading} />
        <StatCard
          icon={TrendingUp}
          label="Taxa de conclusão"
          value={`${taxaConclusao}%`}
          hint={`${finalizadasHoje} finalizadas`}
          loading={loading}
          accent="success"
        />
        <StatCard
          icon={Clock}
          label="Tempo médio"
          value={tempoMedioMin === null ? "—" : `${tempoMedioMin} min`}
          hint="Atendimentos hoje"
          loading={loading}
          accent="warning"
        />
        <StatCard
          icon={Users}
          label="Pacientes"
          value={pacientes}
          hint={`${filasAtivas} filas ativas`}
          loading={loading}
        />
      </div>

      <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-muted/20 p-8 shadow-soft">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <TrendingUp className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <SectionTitle>Visão de gestão</SectionTitle>
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
              Acompanhe os indicadores operacionais da unidade em tempo real. Use as abas
              <strong className="text-foreground"> Filas</strong> e
              <strong className="text-foreground"> Pacientes</strong> para análises detalhadas.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to="/app/filas"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <ListOrdered className="h-4 w-4" /> Ver filas
              </Link>
              <Link
                to="/app/pacientes"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                <Users className="h-4 w-4" /> Ver pacientes
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 * ADMIN — combina visão geral
 * ────────────────────────────────────────────────────────── */

export function AdminWidgets({ unidadeId }: { unidadeId: string }) {
  return (
    <div className="space-y-10">
      <GestorWidgets unidadeId={unidadeId} />
      <div>
        <SectionTitle>Operação em tempo real</SectionTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Visão consolidada de recepção e atendimento clínico.
        </p>
        <div className="mt-5">
          <AtendimentoWidgets unidadeId={unidadeId} />
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 * Fallback (sem role)
 * ────────────────────────────────────────────────────────── */

export function EmptyDashboard() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
      <Loader2 className="mx-auto h-6 w-6 text-muted-foreground" />
      <p className="mt-3 text-sm text-muted-foreground">
        Aguarde — seu perfil ainda não tem funções atribuídas. Procure o administrador da unidade.
      </p>
    </div>
  );
}
