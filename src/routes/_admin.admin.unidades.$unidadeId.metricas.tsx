import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowDownRight,
  ArrowUpRight,
  Activity,
  AlertCircle,
  DollarSign,
  Loader2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/admin/unidades/$unidadeId/metricas")({
  head: () => ({
    meta: [{ title: "Admin · Métricas da unidade — FilaMed" }],
  }),
  component: MetricasUnidadePage,
});

interface SerieMes {
  mes: string;
  mes_label: string;
  receita: number;
  senhas: number;
  notificacoes: number;
  cancelamentos: number;
}

interface KpisUnidade {
  receita_mes_atual: number;
  receita_mes_anterior: number;
  mrr_estimado: number;
  churn_canceladas_mes: number;
  churn_base_inicio_mes: number;
  churn_taxa: number;
  total_senhas_periodo: number;
  total_notificacoes_periodo: number;
  total_notificacoes_falhas_periodo: number;
}

interface MetricasUnidadePayload {
  unidade_id: string;
  unidade_nome: string;
  kpis: KpisUnidade;
  series: SerieMes[];
  gerado_em: string;
}

function formatBRL(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function MetricasUnidadePage() {
  const { unidadeId } = Route.useParams();
  const [meses, setMeses] = useState(6);
  const [data, setData] = useState<MetricasUnidadePayload | null>(null);
  const [loading, setLoading] = useState(true);

  const carregar = async (n: number) => {
    setLoading(true);
    try {
      const { data: resp, error } = await supabase.rpc("admin_metricas_unidade", {
        _unidade_id: unidadeId,
        _meses: n,
      });
      if (error) throw error;
      setData(resp as unknown as MetricasUnidadePayload);
    } catch (e: any) {
      toast.error(e.message || "Falha ao carregar métricas da unidade");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void carregar(meses);
  }, [meses, unidadeId]);

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { kpis, series, unidade_nome } = data;

  const receitaVarPct =
    kpis.receita_mes_anterior > 0
      ? ((kpis.receita_mes_atual - kpis.receita_mes_anterior) / kpis.receita_mes_anterior) * 100
      : kpis.receita_mes_atual > 0
        ? 100
        : 0;

  const taxaFalha =
    kpis.total_notificacoes_periodo > 0
      ? (kpis.total_notificacoes_falhas_periodo / kpis.total_notificacoes_periodo) * 100
      : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link to="/admin/unidades/$unidadeId" params={{ unidadeId }}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Voltar para a unidade
            </Link>
          </Button>
          <h1 className="font-display text-3xl font-bold">Métricas · {unidade_nome}</h1>
          <p className="text-sm text-muted-foreground">
            Receita, churn e uso por mês desta unidade
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(meses)} onValueChange={(v) => setMeses(Number(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Últimos 12 meses</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => void carregar(meses)} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar"}
          </Button>
        </div>
      </div>

      {/* KPIs primários */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receita do mês
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBRL(kpis.receita_mes_atual)}</div>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              {receitaVarPct >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-emerald-500" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-rose-500" />
              )}
              <span className={receitaVarPct >= 0 ? "text-emerald-600" : "text-rose-600"}>
                {receitaVarPct.toFixed(1)}%
              </span>{" "}
              vs. mês anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">MRR estimado</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBRL(kpis.mrr_estimado)}</div>
            <p className="mt-1 text-xs text-muted-foreground">Assinatura ativa nesta unidade</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Churn do mês</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {kpis.churn_base_inicio_mes === 0 ? (
              <>
                <div
                  className="flex items-baseline gap-2"
                  title="Sem assinatura ativa no início do mês — churn não aplicável."
                >
                  <span className="text-2xl font-bold text-muted-foreground">0%</span>
                  <Badge
                    variant="outline"
                    className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  >
                    sem base
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Sem assinatura ativa no início do mês.
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{kpis.churn_taxa}%</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {kpis.churn_canceladas_mes} cancelamento(s) / {kpis.churn_base_inicio_mes} base
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Senhas no período
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.total_senhas_periodo.toLocaleString("pt-BR")}</div>
            <p className="mt-1 text-xs text-muted-foreground">Últimos {meses} meses</p>
          </CardContent>
        </Card>
      </div>

      {/* KPIs secundários */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Notificações enviadas
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpis.total_notificacoes_periodo.toLocaleString("pt-BR")}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Últimos {meses} meses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Falhas de notificação
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpis.total_notificacoes_falhas_periodo.toLocaleString("pt-BR")}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Taxa de falha: {taxaFalha.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receita mês anterior
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBRL(kpis.receita_mes_anterior)}</div>
            <p className="mt-1 text-xs text-muted-foreground">Comparativo</p>
          </CardContent>
        </Card>
      </div>

      {/* Receita por mês */}
      <Card>
        <CardHeader>
          <CardTitle>Receita por mês</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes_label" className="text-xs" />
                <YAxis
                  className="text-xs"
                  tickFormatter={(v: number) => formatBRL(v)}
                  width={90}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                  formatter={(v: number) => formatBRL(v)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="receita"
                  name="Receita"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Cancelamentos por mês */}
      <Card>
        <CardHeader>
          <CardTitle>Cancelamentos por mês</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes_label" className="text-xs" />
                <YAxis className="text-xs" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="cancelamentos"
                  name="Cancelamentos"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Uso por mês */}
      <Card>
        <CardHeader>
          <CardTitle>Uso por mês</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes_label" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="senhas"
                  name="Senhas geradas"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="notificacoes"
                  name="Notificações"
                  fill="hsl(var(--muted-foreground))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
