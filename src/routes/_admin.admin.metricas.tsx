import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  DollarSign,
  Loader2,
  TrendingDown,
  TrendingUp,
  Users,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/admin/metricas")({
  component: MetricasPage,
});

interface SerieMes {
  mes: string;
  mes_label: string;
  receita: number;
  novas_unidades: number;
  cancelamentos: number;
  senhas: number;
  notificacoes: number;
}

interface TopUnidade {
  unidade_id: string;
  nome: string;
  status_assinatura: string;
  plano_nome: string | null;
  senhas_mes: number;
}

interface Kpis {
  receita_mes_atual: number;
  receita_mes_anterior: number;
  mrr_estimado: number;
  unidades_ativas: number;
  unidades_em_trial: number;
  unidades_pagantes: number;
  unidades_suspensas: number;
  unidades_canceladas: number;
  unidades_total: number;
  novas_unidades_mes: number;
  churn_canceladas_mes: number;
  churn_base_inicio_mes: number;
  churn_taxa: number;
  faturas_pendentes_qtd: number;
  faturas_pendentes_valor: number;
}

interface MetricasPayload {
  kpis: Kpis;
  series: SerieMes[];
  top_unidades: TopUnidade[];
  gerado_em: string;
}

function formatBRL(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    ativo: { label: "Ativa", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
    trial: { label: "Trial", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    suspenso: { label: "Suspensa", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    cancelado: { label: "Cancelada", className: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
  };
  const conf = map[status] || { label: status, className: "" };
  return (
    <Badge variant="outline" className={conf.className}>
      {conf.label}
    </Badge>
  );
}

function MetricasPage() {
  const [meses, setMeses] = useState(6);
  const [data, setData] = useState<MetricasPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const carregar = async (n: number) => {
    setLoading(true);
    try {
      const { data: resp, error } = await supabase.rpc("admin_metricas_globais", {
        _meses: n,
      });
      if (error) throw error;
      setData(resp as unknown as MetricasPayload);
    } catch (e: any) {
      toast.error(e.message || "Falha ao carregar métricas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void carregar(meses);
  }, [meses]);

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

  const { kpis, series, top_unidades } = data;

  const receitaVarPct =
    kpis.receita_mes_anterior > 0
      ? ((kpis.receita_mes_atual - kpis.receita_mes_anterior) / kpis.receita_mes_anterior) * 100
      : kpis.receita_mes_atual > 0
        ? 100
        : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Métricas globais</h1>
          <p className="text-sm text-muted-foreground">
            Visão consolidada do SaaS — receita, churn e uso por mês
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

      {/* KPIs principais */}
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
            <div className="mt-1 flex items-center gap-1 text-xs">
              {receitaVarPct >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-emerald-600" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-rose-600" />
              )}
              <span className={receitaVarPct >= 0 ? "text-emerald-600" : "text-rose-600"}>
                {receitaVarPct >= 0 ? "+" : ""}
                {receitaVarPct.toFixed(1)}%
              </span>
              <span className="text-muted-foreground">vs. mês anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              MRR estimado
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBRL(kpis.mrr_estimado)}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Receita recorrente das assinaturas ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unidades ativas
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.unidades_ativas}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {kpis.unidades_pagantes} pagantes · {kpis.unidades_em_trial} em trial
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Churn do mês
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {kpis.churn_base_inicio_mes === 0 ? (
              <>
                <div
                  className="flex items-baseline gap-2"
                  title="Não havia assinaturas ativas no início do mês — taxa de churn não aplicável."
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
                  Sem assinaturas ativas no início do mês — churn não aplicável.
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{kpis.churn_taxa}%</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {kpis.churn_canceladas_mes} cancelamentos / {kpis.churn_base_inicio_mes} base
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* KPIs secundários */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Novas unidades (mês)
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.novas_unidades_mes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Faturas pendentes
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.faturas_pendentes_qtd}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Total: {formatBRL(kpis.faturas_pendentes_valor)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Suspensas
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.unidades_suspensas}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Canceladas (total)
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.unidades_canceladas}</div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de receita */}
      <Card>
        <CardHeader>
          <CardTitle>Receita mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes_label" className="text-xs" />
                <YAxis
                  className="text-xs"
                  tickFormatter={(v) => `R$ ${(v / 100).toLocaleString("pt-BR")}`}
                />
                <Tooltip
                  formatter={(value: number) => formatBRL(value)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                />
                <Bar dataKey="receita" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico crescimento e churn */}
      <Card>
        <CardHeader>
          <CardTitle>Novas unidades vs. cancelamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
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
                  dataKey="novas_unidades"
                  name="Novas unidades"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                />
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

      {/* Gráfico uso */}
      <Card>
        <CardHeader>
          <CardTitle>Uso da plataforma</CardTitle>
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

      {/* Top unidades */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 unidades por uso (mês atual)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unidade</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Senhas no mês</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {top_unidades.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    Sem dados de uso no mês.
                  </TableCell>
                </TableRow>
              ) : (
                top_unidades.map((u) => (
                  <TableRow key={u.unidade_id}>
                    <TableCell className="font-medium">{u.nome}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.plano_nome ?? "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={u.status_assinatura} />
                    </TableCell>
                    <TableCell className="text-right font-mono">{u.senhas_mes}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
