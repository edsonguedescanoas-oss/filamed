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

export function AtendimentoWidgets({ unidadeId }: { unidadeId: string }) {
  const [loading, setLoading] = useState(true);
  const [aguardando, setAguardando] = useState(0);
  const [chamadas, setChamadas] = useState(0);
  const [emAtendimento, setEmAtendimento] = useState(0);
  const [proximas, setProximas] = useState<
    {
      id: string;
      codigo: string;
      prioridade: string;
      created_at: string;
      filas: { nome: string; cor: string | null } | null;
    }[]
  >([]);

  useEffect(() => {
    let cancel = false;
    const load = async () => {
      setLoading(true);
      const [agRes, chRes, emRes, proxRes] = await Promise.all([
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
          .select("id,codigo,prioridade,created_at,filas(nome,cor)")
          .eq("unidade_id", unidadeId)
          .eq("status", "aguardando")
          .order("prioridade", { ascending: false })
          .order("created_at", { ascending: true })
          .limit(8),
      ]);
      if (cancel) return;
      setAguardando(agRes.count ?? 0);
      setChamadas(chRes.count ?? 0);
      setEmAtendimento(emRes.count ?? 0);
      setProximas((proxRes.data ?? []) as typeof proximas);
      setLoading(false);
    };
    void load();
    return () => {
      cancel = true;
    };
  }, [unidadeId]);

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
        <div className="flex items-center justify-between">
          <SectionTitle>Próximos pacientes na fila</SectionTitle>
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
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-1 rounded-full"
                      style={{ backgroundColor: s.filas?.cor ?? "hsl(var(--primary))" }}
                    />
                    <div>
                      <div className="font-mono text-base font-bold">{s.codigo}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.filas?.nome ?? "—"} · {wait} min
                      </div>
                    </div>
                  </div>
                  {s.prioridade !== "normal" && (
                    <Badge variant="outline" className="capitalize text-xs">
                      {s.prioridade}
                    </Badge>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
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
