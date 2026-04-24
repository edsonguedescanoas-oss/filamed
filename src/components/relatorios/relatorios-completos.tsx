import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Clock,
  Download,
  Loader2,
  Stethoscope,
  Ticket,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, subDays, startOfDay, eachDayOfInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { trackEvent } from "@/lib/analytics";

/* ──────────────────────────────────────────────────────────
 * Tipos auxiliares
 * ────────────────────────────────────────────────────────── */

type Periodo = "7" | "15" | "30";

interface SenhaRow {
  id: string;
  codigo: string;
  status: string;
  prioridade: string;
  fila_id: string;
  paciente_id: string | null;
  created_at: string;
  finalizada_em: string | null;
  updated_at: string;
}

interface AtendimentoRow {
  id: string;
  senha_id: string;
  profissional_id: string | null;
  iniciado_em: string;
  finalizado_em: string | null;
  duracao_segundos: number | null;
}

interface FilaRow {
  id: string;
  nome: string;
  cor: string | null;
  tipo: string;
}

interface ProfileRow {
  id: string;
  nome_completo: string;
}

/* ──────────────────────────────────────────────────────────
 * Utilidades
 * ────────────────────────────────────────────────────────── */

function fmtMin(seg: number | null): string {
  if (seg === null || seg === 0) return "—";
  const m = Math.floor(seg / 60);
  const s = Math.floor(seg % 60);
  if (m < 1) return `${s}s`;
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  return `${h}h${(m % 60).toString().padStart(2, "0")}`;
}

function avg(xs: number[]): number {
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const COLORS_PIE = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4"];

/* ──────────────────────────────────────────────────────────
 * Componente principal
 * ────────────────────────────────────────────────────────── */

export function RelatoriosCompletos({ unidadeId }: { unidadeId: string }) {
  const [periodo, setPeriodo] = useState<Periodo>("7");
  const [loading, setLoading] = useState(true);
  const [senhas, setSenhas] = useState<SenhaRow[]>([]);
  const [atendimentos, setAtendimentos] = useState<AtendimentoRow[]>([]);
  const [filas, setFilas] = useState<FilaRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);

  useEffect(() => {
    let cancel = false;
    const load = async () => {
      setLoading(true);
      const dias = parseInt(periodo, 10);
      const inicio = startOfDay(subDays(new Date(), dias - 1)).toISOString();

      const [sRes, aRes, fRes, pRes] = await Promise.all([
        supabase
          .from("senhas")
          .select("id,codigo,status,prioridade,fila_id,paciente_id,created_at,finalizada_em,updated_at")
          .eq("unidade_id", unidadeId)
          .gte("created_at", inicio)
          .order("created_at", { ascending: true }),
        supabase
          .from("atendimentos")
          .select("id,senha_id,profissional_id,iniciado_em,finalizado_em,duracao_segundos")
          .eq("unidade_id", unidadeId)
          .gte("iniciado_em", inicio)
          .order("iniciado_em", { ascending: true }),
        supabase
          .from("filas")
          .select("id,nome,cor,tipo")
          .eq("unidade_id", unidadeId),
        supabase
          .from("profiles")
          .select("id,nome_completo")
          .eq("unidade_id", unidadeId),
      ]);
      if (cancel) return;

      setSenhas((sRes.data ?? []) as SenhaRow[]);
      setAtendimentos((aRes.data ?? []) as AtendimentoRow[]);
      setFilas((fRes.data ?? []) as FilaRow[]);
      setProfiles((pRes.data ?? []) as ProfileRow[]);
      setLoading(false);
    };
    void load();
    return () => {
      cancel = true;
    };
  }, [unidadeId, periodo]);

  /* ───────── Agregações ───────── */

  const filaMap = useMemo(() => {
    const m = new Map<string, FilaRow>();
    filas.forEach((f) => m.set(f.id, f));
    return m;
  }, [filas]);

  const profMap = useMemo(() => {
    const m = new Map<string, string>();
    profiles.forEach((p) => m.set(p.id, p.nome_completo));
    return m;
  }, [profiles]);

  // Tempo de espera (ms) por senha = primeiro atendimento - created_at (ou updated_at p/ não atendidas)
  const senhaToAtend = useMemo(() => {
    const m = new Map<string, AtendimentoRow>();
    atendimentos.forEach((a) => {
      const cur = m.get(a.senha_id);
      if (!cur || a.iniciado_em < cur.iniciado_em) m.set(a.senha_id, a);
    });
    return m;
  }, [atendimentos]);

  // Série diária: senhas geradas, finalizadas, ausentes, tempo médio espera, tempo médio atendimento
  const serieDiaria = useMemo(() => {
    const dias = parseInt(periodo, 10);
    const hoje = startOfDay(new Date());
    const inicio = subDays(hoje, dias - 1);
    const range = eachDayOfInterval({ start: inicio, end: hoje });

    return range.map((d) => {
      const dayStart = startOfDay(d).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;

      const senhasDia = senhas.filter((s) => {
        const t = parseISO(s.created_at).getTime();
        return t >= dayStart && t < dayEnd;
      });

      const finalizadas = senhasDia.filter((s) => s.status === "finalizada").length;
      const ausentes = senhasDia.filter((s) => s.status === "ausente").length;
      const canceladas = senhasDia.filter((s) => s.status === "cancelada").length;

      const esperaMin: number[] = [];
      senhasDia.forEach((s) => {
        const a = senhaToAtend.get(s.id);
        if (a) {
          const ms = parseISO(a.iniciado_em).getTime() - parseISO(s.created_at).getTime();
          if (ms > 0) esperaMin.push(ms / 60000);
        }
      });

      const atendDia = atendimentos.filter((a) => {
        const t = parseISO(a.iniciado_em).getTime();
        return t >= dayStart && t < dayEnd && a.duracao_segundos && a.duracao_segundos > 0;
      });
      const duracaoMin = atendDia.map((a) => (a.duracao_segundos ?? 0) / 60);

      return {
        dia: format(d, "dd/MM", { locale: ptBR }),
        diaCompleto: format(d, "EEE dd/MM", { locale: ptBR }),
        senhas: senhasDia.length,
        finalizadas,
        ausentes,
        canceladas,
        esperaMedia: Math.round(avg(esperaMin) * 10) / 10,
        atendimentoMedio: Math.round(avg(duracaoMin) * 10) / 10,
        taxaConclusao:
          senhasDia.length > 0 ? Math.round((finalizadas / senhasDia.length) * 100) : 0,
      };
    });
  }, [senhas, atendimentos, senhaToAtend, periodo]);

  // Por fila
  const porFila = useMemo(() => {
    const map = new Map<
      string,
      { fila: FilaRow; total: number; finalizadas: number; espera: number[]; duracao: number[] }
    >();
    senhas.forEach((s) => {
      const f = filaMap.get(s.fila_id);
      if (!f) return;
      let cur = map.get(s.fila_id);
      if (!cur) {
        cur = { fila: f, total: 0, finalizadas: 0, espera: [], duracao: [] };
        map.set(s.fila_id, cur);
      }
      cur.total += 1;
      if (s.status === "finalizada") cur.finalizadas += 1;
      const a = senhaToAtend.get(s.id);
      if (a) {
        const ms = parseISO(a.iniciado_em).getTime() - parseISO(s.created_at).getTime();
        if (ms > 0) cur.espera.push(ms / 60000);
        if (a.duracao_segundos && a.duracao_segundos > 0) cur.duracao.push(a.duracao_segundos / 60);
      }
    });
    return Array.from(map.values())
      .map((x) => ({
        nome: x.fila.nome,
        cor: x.fila.cor ?? "#3B82F6",
        tipo: x.fila.tipo,
        total: x.total,
        finalizadas: x.finalizadas,
        taxa: x.total ? Math.round((x.finalizadas / x.total) * 100) : 0,
        esperaMedia: Math.round(avg(x.espera) * 10) / 10,
        esperaMediana: Math.round(median(x.espera) * 10) / 10,
        atendimentoMedio: Math.round(avg(x.duracao) * 10) / 10,
      }))
      .sort((a, b) => b.total - a.total);
  }, [senhas, filaMap, senhaToAtend]);

  // Por profissional
  const porProfissional = useMemo(() => {
    const map = new Map<
      string,
      { nome: string; atendimentos: number; duracaoTotal: number; duracoes: number[] }
    >();
    atendimentos.forEach((a) => {
      if (!a.profissional_id) return;
      const nome = profMap.get(a.profissional_id) ?? "Profissional";
      let cur = map.get(a.profissional_id);
      if (!cur) {
        cur = { nome, atendimentos: 0, duracaoTotal: 0, duracoes: [] };
        map.set(a.profissional_id, cur);
      }
      cur.atendimentos += 1;
      if (a.duracao_segundos && a.duracao_segundos > 0) {
        cur.duracaoTotal += a.duracao_segundos;
        cur.duracoes.push(a.duracao_segundos / 60);
      }
    });
    return Array.from(map.values())
      .map((x) => ({
        nome: x.nome,
        atendimentos: x.atendimentos,
        tempoTotalMin: Math.round(x.duracaoTotal / 60),
        tempoMedioMin: Math.round(avg(x.duracoes) * 10) / 10,
      }))
      .sort((a, b) => b.atendimentos - a.atendimentos);
  }, [atendimentos, profMap]);

  // Distribuição por hora do dia (heatmap simples em barras)
  const porHora = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({
      hora: `${h.toString().padStart(2, "0")}h`,
      senhas: 0,
      atendimentos: 0,
    }));
    senhas.forEach((s) => {
      const h = parseISO(s.created_at).getHours();
      buckets[h].senhas += 1;
    });
    atendimentos.forEach((a) => {
      const h = parseISO(a.iniciado_em).getHours();
      buckets[h].atendimentos += 1;
    });
    return buckets;
  }, [senhas, atendimentos]);

  // Distribuição de prioridade
  const porPrioridade = useMemo(() => {
    const counts: Record<string, number> = { normal: 0, preferencial: 0, urgente: 0 };
    senhas.forEach((s) => {
      counts[s.prioridade] = (counts[s.prioridade] ?? 0) + 1;
    });
    return Object.entries(counts).map(([nome, value]) => ({ nome, value }));
  }, [senhas]);

  // Status mix
  const porStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    senhas.forEach((s) => {
      counts[s.status] = (counts[s.status] ?? 0) + 1;
    });
    return Object.entries(counts).map(([nome, value]) => ({ nome, value }));
  }, [senhas]);

  // KPIs gerais do período
  const kpis = useMemo(() => {
    const total = senhas.length;
    const finalizadas = senhas.filter((s) => s.status === "finalizada").length;
    const ausentes = senhas.filter((s) => s.status === "ausente").length;
    const canceladas = senhas.filter((s) => s.status === "cancelada").length;
    const esperas: number[] = [];
    senhas.forEach((s) => {
      const a = senhaToAtend.get(s.id);
      if (a) {
        const ms = parseISO(a.iniciado_em).getTime() - parseISO(s.created_at).getTime();
        if (ms > 0) esperas.push(ms / 60000);
      }
    });
    const duracoes = atendimentos
      .map((a) => a.duracao_segundos ?? 0)
      .filter((n) => n > 0)
      .map((n) => n / 60);
    return {
      total,
      finalizadas,
      ausentes,
      canceladas,
      taxaConclusao: total ? Math.round((finalizadas / total) * 100) : 0,
      taxaAusencia: total ? Math.round((ausentes / total) * 100) : 0,
      esperaMedia: Math.round(avg(esperas) * 10) / 10,
      esperaMediana: Math.round(median(esperas) * 10) / 10,
      esperaMax: Math.round(Math.max(0, ...esperas) * 10) / 10,
      duracaoMedia: Math.round(avg(duracoes) * 10) / 10,
      duracaoTotal: Math.round(duracoes.reduce((a, b) => a + b, 0)),
      atendimentos: atendimentos.length,
    };
  }, [senhas, atendimentos, senhaToAtend]);

  // Gargalos detectados (heurísticas)
  const gargalos = useMemo(() => {
    const out: { titulo: string; descricao: string; severidade: "alta" | "media" | "baixa" }[] = [];
    if (kpis.taxaAusencia >= 15) {
      out.push({
        titulo: `Taxa de ausência alta (${kpis.taxaAusencia}%)`,
        descricao:
          "Mais de 15% dos pacientes não comparecem após a chamada. Considere notificações por SMS/WhatsApp e encurtar o tempo entre senha e chamada.",
        severidade: "alta",
      });
    }
    if (kpis.esperaMedia > 30) {
      out.push({
        titulo: `Espera média elevada (${kpis.esperaMedia} min)`,
        descricao:
          "Acima de 30 min em média. Revise dimensionamento da equipe nos horários de pico.",
        severidade: kpis.esperaMedia > 60 ? "alta" : "media",
      });
    }
    porFila.forEach((f) => {
      if (f.total >= 5 && f.taxa < 60) {
        out.push({
          titulo: `Fila "${f.nome}" com baixa conclusão (${f.taxa}%)`,
          descricao: `Apenas ${f.finalizadas} de ${f.total} senhas foram finalizadas. Verifique escala/equipe alocada.`,
          severidade: "media",
        });
      }
      if (f.esperaMedia > 45) {
        out.push({
          titulo: `Fila "${f.nome}" com espera longa (${f.esperaMedia} min)`,
          descricao: "Considere abrir um guichê extra ou redistribuir senhas.",
          severidade: f.esperaMedia > 90 ? "alta" : "media",
        });
      }
    });
    // Pico de demanda
    const horaPico = porHora.reduce((max, h) => (h.senhas > max.senhas ? h : max), porHora[0]);
    if (horaPico && horaPico.senhas >= 10) {
      out.push({
        titulo: `Pico de demanda em ${horaPico.hora}`,
        descricao: `${horaPico.senhas} senhas geradas neste horário no período. Reforce equipe nesta janela.`,
        severidade: "baixa",
      });
    }
    return out.slice(0, 6);
  }, [kpis, porFila, porHora]);

  /* ───────── Export CSV ───────── */

  const exportarCSV = () => {
    trackEvent("download_report", { format: "CSV", type: "operational_report", unit_id: unidadeId });
    const rows: (string | number)[][] = [
      ["Relatório operacional — Período de", `${periodo} dias`],
      [],
      ["Resumo do período"],
      ["Total de senhas", kpis.total],
      ["Atendimentos finalizados", kpis.finalizadas],
      ["Ausências", kpis.ausentes],
      ["Cancelamentos", kpis.canceladas],
      ["Taxa de conclusão (%)", kpis.taxaConclusao],
      ["Taxa de ausência (%)", kpis.taxaAusencia],
      ["Espera média (min)", kpis.esperaMedia],
      ["Espera mediana (min)", kpis.esperaMediana],
      ["Espera máxima (min)", kpis.esperaMax],
      ["Duração média atendimento (min)", kpis.duracaoMedia],
      [],
      ["Dia a dia"],
      ["Dia", "Senhas", "Finalizadas", "Ausentes", "Canceladas", "Espera média (min)", "Atendimento médio (min)", "Taxa conclusão (%)"],
      ...serieDiaria.map((d) => [
        d.diaCompleto,
        d.senhas,
        d.finalizadas,
        d.ausentes,
        d.canceladas,
        d.esperaMedia,
        d.atendimentoMedio,
        d.taxaConclusao,
      ]),
      [],
      ["Por fila"],
      ["Fila", "Tipo", "Total", "Finalizadas", "Taxa (%)", "Espera média (min)", "Espera mediana (min)", "Atendimento médio (min)"],
      ...porFila.map((f) => [
        f.nome,
        f.tipo,
        f.total,
        f.finalizadas,
        f.taxa,
        f.esperaMedia,
        f.esperaMediana,
        f.atendimentoMedio,
      ]),
      [],
      ["Por profissional"],
      ["Profissional", "Atendimentos", "Tempo total (min)", "Tempo médio (min)"],
      ...porProfissional.map((p) => [p.nome, p.atendimentos, p.tempoTotalMin, p.tempoMedioMin]),
    ];
    downloadCSV(`relatorio-${format(new Date(), "yyyy-MM-dd")}.csv`, rows);
  };

  /* ───────── Render ───────── */

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header com filtros */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Tabs value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
          <TabsList>
            <TabsTrigger value="7">Últimos 7 dias</TabsTrigger>
            <TabsTrigger value="15">15 dias</TabsTrigger>
            <TabsTrigger value="30">30 dias</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={exportarCSV} variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* KPIs principais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Ticket}
          label="Senhas no período"
          value={kpis.total.toString()}
          hint={`${kpis.atendimentos} atendimentos`}
          accent="primary"
        />
        <KpiCard
          icon={Clock}
          label="Espera média"
          value={`${kpis.esperaMedia} min`}
          hint={`Mediana ${kpis.esperaMediana} min · máx ${kpis.esperaMax} min`}
          accent="warning"
        />
        <KpiCard
          icon={Stethoscope}
          label="Atendimento médio"
          value={`${kpis.duracaoMedia} min`}
          hint={`${Math.round(kpis.duracaoTotal / 60)}h totais no período`}
          accent="primary"
        />
        <KpiCard
          icon={Activity}
          label="Conclusão"
          value={`${kpis.taxaConclusao}%`}
          hint={`Ausência ${kpis.taxaAusencia}% · ${kpis.canceladas} canceladas`}
          accent={kpis.taxaConclusao >= 80 ? "success" : "warning"}
        />
      </div>

      {/* Gargalos */}
      {gargalos.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="font-display text-xl font-semibold">Gargalos identificados</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {gargalos.map((g, i) => (
              <div
                key={i}
                className={`rounded-xl border p-4 ${
                  g.severidade === "alta"
                    ? "border-destructive/40 bg-destructive/5"
                    : g.severidade === "media"
                      ? "border-amber-500/40 bg-amber-500/5"
                      : "border-border bg-muted/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm">{g.titulo}</p>
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase tracking-wider ${
                      g.severidade === "alta"
                        ? "border-destructive text-destructive"
                        : g.severidade === "media"
                          ? "border-amber-500 text-amber-600 dark:text-amber-400"
                          : ""
                    }`}
                  >
                    {g.severidade}
                  </Badge>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">{g.descricao}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gráfico: senhas dia a dia (área) */}
      <ChartCard
        titulo="Senhas e atendimentos — dia a dia"
        descricao="Evolução diária de geração e conclusão"
      >
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={serieDiaria}>
            <defs>
              <linearGradient id="grSenhas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="grFin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="senhas"
              name="Senhas geradas"
              stroke="#3B82F6"
              fill="url(#grSenhas)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="finalizadas"
              name="Finalizadas"
              stroke="#10B981"
              fill="url(#grFin)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Gráfico: tempos */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          titulo="Tempo médio de espera (min)"
          descricao="Da senha ao início do atendimento"
        >
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={serieDiaria}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                }}
              />
              <Line
                type="monotone"
                dataKey="esperaMedia"
                stroke="#F59E0B"
                strokeWidth={2.5}
                name="Espera (min)"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          titulo="Tempo médio de atendimento (min)"
          descricao="Duração registrada por atendimento"
        >
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={serieDiaria}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                }}
              />
              <Line
                type="monotone"
                dataKey="atendimentoMedio"
                stroke="#8B5CF6"
                strokeWidth={2.5}
                name="Atendimento (min)"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Por hora do dia */}
      <ChartCard
        titulo="Distribuição por hora do dia"
        descricao="Identifica picos de demanda durante o expediente"
      >
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={porHora}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis dataKey="hora" stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
              }}
            />
            <Legend />
            <Bar dataKey="senhas" name="Senhas geradas" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="atendimentos" name="Atendimentos" fill="#10B981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Por fila + Pizzas */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard
            titulo="Desempenho por fila/consultório"
            descricao="Volume e tempos por área"
          >
            {porFila.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum dado de fila no período.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="py-2 pr-3">Fila</th>
                      <th className="py-2 pr-3">Total</th>
                      <th className="py-2 pr-3">Concluído</th>
                      <th className="py-2 pr-3">Taxa</th>
                      <th className="py-2 pr-3">Espera méd.</th>
                      <th className="py-2 pr-3">Atend. méd.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porFila.map((f) => (
                      <tr key={f.nome} className="border-b border-border/40 last:border-0">
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: f.cor }}
                            />
                            <span className="font-medium">{f.nome}</span>
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {f.tipo}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-2.5 pr-3 tabular-nums">{f.total}</td>
                        <td className="py-2.5 pr-3 tabular-nums">{f.finalizadas}</td>
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${f.taxa}%` }}
                              />
                            </div>
                            <span className="tabular-nums text-xs">{f.taxa}%</span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-3 tabular-nums">
                          {f.esperaMedia > 0 ? `${f.esperaMedia} min` : "—"}
                        </td>
                        <td className="py-2.5 pr-3 tabular-nums">
                          {f.atendimentoMedio > 0 ? `${f.atendimentoMedio} min` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ChartCard>
        </div>

        <ChartCard titulo="Status das senhas" descricao="Mix do período">
          {porStatus.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sem dados.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={porStatus}
                  dataKey="value"
                  nameKey="nome"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(entry) => `${entry.nome}: ${entry.value}`}
                  labelLine={false}
                >
                  {porStatus.map((_, i) => (
                    <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Profissionais + Prioridade */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard
            titulo="Produtividade por profissional"
            descricao="Atendimentos e tempo médio"
          >
            {porProfissional.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum atendimento registrado por profissional ainda.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={porProfissional} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis
                    dataKey="nome"
                    type="category"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="atendimentos"
                    name="Atendimentos"
                    fill="#3B82F6"
                    radius={[0, 4, 4, 0]}
                  />
                  <Bar
                    dataKey="tempoMedioMin"
                    name="Tempo médio (min)"
                    fill="#8B5CF6"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <ChartCard titulo="Prioridade" descricao="Mix de chamadas no período">
          {porPrioridade.every((p) => p.value === 0) ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sem dados.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={porPrioridade}
                  dataKey="value"
                  nameKey="nome"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  label={(entry) => `${entry.nome}: ${entry.value}`}
                  labelLine={false}
                >
                  <Cell fill="#3B82F6" />
                  <Cell fill="#10B981" />
                  <Cell fill="#EF4444" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Taxa de conclusão diária (linha tendência) */}
      <ChartCard
        titulo="Taxa de conclusão diária"
        descricao="Percentual de senhas finalizadas por dia"
      >
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={serieDiaria}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
              }}
              formatter={(v) => `${v}%`}
            />
            <Line
              type="monotone"
              dataKey="taxaConclusao"
              stroke="#10B981"
              strokeWidth={2.5}
              name="Conclusão"
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 * Sub-componentes
 * ────────────────────────────────────────────────────────── */

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = "primary",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  accent?: "primary" | "success" | "warning" | "danger";
}) {
  const accentBg = {
    primary: "bg-gradient-primary text-primary-foreground shadow-glow",
    success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    danger: "bg-destructive/15 text-destructive",
  }[accent];

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accentBg}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-4 font-display text-2xl font-bold">{value}</div>
      <div className="mt-0.5 text-sm font-medium">{label}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function ChartCard({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div>
        <h3 className="font-display text-lg font-semibold">{titulo}</h3>
        {descricao && <p className="mt-0.5 text-xs text-muted-foreground">{descricao}</p>}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}
