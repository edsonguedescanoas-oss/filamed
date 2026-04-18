import { useEffect, useState } from "react";
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
};

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

export function AtendimentoWidgets({ unidadeId }: { unidadeId: string }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [aguardando, setAguardando] = useState(0);
  const [chamadas, setChamadas] = useState(0);
  const [emAtendimento, setEmAtendimento] = useState(0);
  const [proximas, setProximas] = useState<ProximaSenha[]>([]);
  const [temAtivo, setTemAtivo] = useState(false);

  // Modal de chamada
  const [chamarSenha, setChamarSenha] = useState<ProximaSenha | null>(null);
  const [destino, setDestino] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Loading por linha (Chamar / Iniciar)
  const [actionId, setActionId] = useState<string | null>(null);

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
          .select("id,codigo,prioridade,status,created_at,updated_at,fila_id,paciente_id,filas(nome,cor)")
          .eq("unidade_id", unidadeId)
          .in("status", ["aguardando", "chamada"])
          .order("prioridade", { ascending: false })
          .order("created_at", { ascending: true })
          .limit(10),
        user
          ? supabase
              .from("atendimentos")
              .select("id", { count: "exact", head: true })
              .eq("unidade_id", unidadeId)
              .eq("profissional_id", user.id)
              .is("finalizado_em", null)
          : Promise.resolve({ count: 0 }),
      ]);
      if (cancel) return;
      setAguardando(agRes.count ?? 0);
      setChamadas(chRes.count ?? 0);
      setEmAtendimento(emRes.count ?? 0);
      setProximas(sortSenhas((proxRes.data ?? []) as ProximaSenha[]));
      setTemAtivo(((ativoRes as { count: number | null }).count ?? 0) > 0);
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
            setProximas((prev) => prev.filter((p) => p.id !== old.id));
            await recountStatuses();
            return;
          }

          const row = payload.new as Omit<ProximaSenha, "filas"> & { filas?: never };
          const ativa = ["aguardando", "chamada"].includes(row.status);

          if (!ativa) {
            // saiu da nossa lista (em_atendimento, finalizada, etc.)
            setProximas((prev) => prev.filter((p) => p.id !== row.id));
            await recountStatuses();
            return;
          }

          // Buscar dados da fila para enriquecer (sem await bloqueante)
          const { data: filaData } = await supabase
            .from("filas")
            .select("nome,cor")
            .eq("id", row.fila_id)
            .maybeSingle();

          const enriched: ProximaSenha = {
            ...row,
            filas: filaData ?? null,
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
          const { count } = await supabase
            .from("atendimentos")
            .select("id", { count: "exact", head: true })
            .eq("unidade_id", unidadeId)
            .eq("profissional_id", user.id)
            .is("finalizado_em", null);
          setTemAtivo((count ?? 0) > 0);
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
      setChamarSenha(null);
      setDestino("");
      // o realtime vai atualizar lista e contadores
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
      const { error: e1 } = await supabase.from("atendimentos").insert({
        unidade_id: unidadeId,
        senha_id: s.id,
        paciente_id: s.paciente_id,
        profissional_id: user.id,
      });
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("senhas")
        .update({ status: "em_atendimento", updated_at: new Date().toISOString() })
        .eq("id", s.id);
      if (e2) throw e2;
      toast.success(`Atendimento iniciado: ${s.codigo}.`);
      // realtime cuida do resto
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao iniciar atendimento.");
    } finally {
      setActionId(null);
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
