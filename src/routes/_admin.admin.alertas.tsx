import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Building2,
  ChevronDown,
  ChevronRight,
  Filter,
  Loader2,
  MessageCircle,
  RefreshCw,
  Siren,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/admin/alertas")({
  head: () => ({
    meta: [{ title: "Admin · Alertas de notificações — FilaMed" }],
  }),
  component: AdminAlertasPage,
});

interface AlertaLinha {
  unidade_id: string;
  unidade_nome: string;
  canal: string;
  destinatario: string;
  total_falhas: number;
  total_tentativas: number;
  primeira_falha: string;
  ultima_falha: string;
  ultimo_erro: string | null;
  severidade: "critica" | "alta" | "media";
  notificacao_ids: string[];
}

interface ResumoAlertas {
  total_alertas: number;
  criticos: number;
  altos: number;
  medios: number;
  unidades_afetadas: number;
  canais_afetados: Record<string, number> | null;
}

const CANAL_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  telegram: "Telegram",
  email: "Email",
  push: "Push",
};

const SEVERIDADE_VARIANT: Record<
  AlertaLinha["severidade"],
  { label: string; className: string; icon: typeof Siren }
> = {
  critica: {
    label: "Crítica",
    className: "bg-destructive/10 text-destructive border-destructive/30",
    icon: Siren,
  },
  alta: {
    label: "Alta",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
    icon: AlertTriangle,
  },
  media: {
    label: "Média",
    className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
    icon: Bell,
  },
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h atrás`;
  const d = Math.floor(h / 24);
  return `${d} d atrás`;
}

function AdminAlertasPage() {
  const [alertas, setAlertas] = useState<AlertaLinha[]>([]);
  const [resumo, setResumo] = useState<ResumoAlertas | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [janela, setJanela] = useState("24");
  const [minFalhas, setMinFalhas] = useState("2");
  const [filtroCanal, setFiltroCanal] = useState<string>("todos");
  const [filtroSeveridade, setFiltroSeveridade] = useState<string>("todas");
  const [expandido, setExpandido] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setRefreshing(true);
    const args = { _janela_horas: Number(janela), _min_falhas: Number(minFalhas) };
    const [{ data: lista, error: e1 }, { data: r, error: e2 }] = await Promise.all([
      (
        supabase.rpc as unknown as (
          fn: string,
          a: Record<string, unknown>,
        ) => Promise<{ data: AlertaLinha[] | null; error: { message: string } | null }>
      )("admin_alertas_notificacoes", args),
      (
        supabase.rpc as unknown as (
          fn: string,
          a: Record<string, unknown>,
        ) => Promise<{ data: ResumoAlertas | null; error: { message: string } | null }>
      )("admin_alertas_resumo", args),
    ]);
    if (e1) toast.error("Falha ao listar alertas", { description: e1.message });
    if (e2) toast.error("Falha ao calcular resumo", { description: e2.message });
    setAlertas(lista ?? []);
    setResumo(r);
    setLoading(false);
    setRefreshing(false);
  }, [janela, minFalhas]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const filtrados = useMemo(() => {
    return alertas.filter((a) => {
      if (filtroCanal !== "todos" && a.canal !== filtroCanal) return false;
      if (filtroSeveridade !== "todas" && a.severidade !== filtroSeveridade) return false;
      return true;
    });
  }, [alertas, filtroCanal, filtroSeveridade]);

  const canaisDisponiveis = useMemo(
    () => Array.from(new Set(alertas.map((a) => a.canal))),
    [alertas],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Alertas de notificações</h1>
          <p className="text-sm text-muted-foreground">
            Falhas repetidas agrupadas por unidade, canal e destinatário.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={carregar} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Resumo */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <ResumoCard
          icon={Siren}
          label="Críticos"
          value={resumo?.criticos ?? 0}
          tone="crit"
          hint="≥ 10 falhas"
        />
        <ResumoCard
          icon={AlertTriangle}
          label="Altos"
          value={resumo?.altos ?? 0}
          tone="warn"
          hint="5-9 falhas"
        />
        <ResumoCard
          icon={Bell}
          label="Médios"
          value={resumo?.medios ?? 0}
          tone="info"
          hint="2-4 falhas"
        />
        <ResumoCard
          icon={Building2}
          label="Unidades afetadas"
          value={resumo?.unidades_afetadas ?? 0}
          tone="neutro"
        />
        <ResumoCard
          icon={TrendingUp}
          label="Total alertas"
          value={resumo?.total_alertas ?? 0}
          tone="neutro"
        />
      </div>

      {/* Filtros */}
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-3 py-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Janela</label>
            <Select value={janela} onValueChange={setJanela}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Última hora</SelectItem>
                <SelectItem value="6">Últimas 6h</SelectItem>
                <SelectItem value="24">Últimas 24h</SelectItem>
                <SelectItem value="72">Últimos 3 dias</SelectItem>
                <SelectItem value="168">Últimos 7 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Mínimo de falhas</label>
            <Select value={minFalhas} onValueChange={setMinFalhas}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">≥ 2</SelectItem>
                <SelectItem value="3">≥ 3</SelectItem>
                <SelectItem value="5">≥ 5</SelectItem>
                <SelectItem value="10">≥ 10</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Canal</label>
            <Select value={filtroCanal} onValueChange={setFiltroCanal}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os canais</SelectItem>
                {canaisDisponiveis.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CANAL_LABEL[c] ?? c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Severidade</label>
            <Select value={filtroSeveridade} onValueChange={setFiltroSeveridade}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="critica">Crítica</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Média</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            {filtrados.length} de {alertas.length} alertas
          </div>
        </CardContent>
      </Card>

      {/* Lista de alertas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alertas ativos</CardTitle>
          <CardDescription>
            Clique em um alerta para ver detalhes e o último erro registrado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Bell className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Nenhum alerta na janela selecionada</p>
              <p className="text-xs text-muted-foreground">
                Tudo certo — nenhuma unidade/canal acumulou falhas repetidas.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtrados.map((a) => {
                const key = `${a.unidade_id}|${a.canal}|${a.destinatario}`;
                const isOpen = expandido === key;
                const sev = SEVERIDADE_VARIANT[a.severidade];
                const SevIcon = sev.icon;
                return (
                  <div
                    key={key}
                    className={`rounded-lg border ${
                      a.severidade === "critica"
                        ? "border-destructive/30 bg-destructive/5"
                        : a.severidade === "alta"
                          ? "border-amber-500/30 bg-amber-500/5"
                          : "border-border bg-card"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandido(isOpen ? null : key)}
                      className="flex w-full items-center gap-3 p-3 text-left"
                    >
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <Badge variant="outline" className={sev.className}>
                        <SevIcon className="mr-1 h-3 w-3" />
                        {sev.label}
                      </Badge>
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-semibold">{a.unidade_nome}</span>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <MessageCircle className="h-3 w-3" />
                          {CANAL_LABEL[a.canal] ?? a.canal}
                        </span>
                        <span className="truncate font-mono text-xs text-muted-foreground">
                          {a.destinatario}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-xs">
                        <span className="font-bold text-destructive">{a.total_falhas} falhas</span>
                        <span className="text-muted-foreground">
                          última {formatRelative(a.ultima_falha)}
                        </span>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="space-y-2 border-t border-border/50 px-4 pb-3 pt-2 text-xs">
                        <div className="grid gap-2 sm:grid-cols-3">
                          <Info label="Total tentativas" value={String(a.total_tentativas)} />
                          <Info label="Primeira falha" value={formatRelative(a.primeira_falha)} />
                          <Info label="Última falha" value={formatRelative(a.ultima_falha)} />
                        </div>
                        {a.ultimo_erro && (
                          <div className="rounded border border-destructive/20 bg-destructive/5 p-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-destructive">
                              Último erro
                            </p>
                            <p className="mt-1 font-mono text-destructive">{a.ultimo_erro}</p>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button asChild size="sm" variant="outline">
                            <Link
                              to="/admin/unidades/$unidadeId"
                              params={{ unidadeId: a.unidade_id }}
                            >
                              <Building2 className="h-3 w-3" />
                              Abrir unidade
                            </Link>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link to="/admin/auditoria">
                              <Filter className="h-3 w-3" />
                              Ver auditoria
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ResumoCard({
  icon: Icon,
  label,
  value,
  tone,
  hint,
}: {
  icon: typeof Bell;
  label: string;
  value: number;
  tone: "crit" | "warn" | "info" | "neutro";
  hint?: string;
}) {
  const toneClass = {
    crit: "border-destructive/30 bg-destructive/5 text-destructive",
    warn: "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400",
    info: "border-yellow-500/30 bg-yellow-500/5 text-yellow-700 dark:text-yellow-400",
    neutro: "border-border bg-card text-foreground",
  }[tone];
  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 text-3xl font-bold">{value.toLocaleString("pt-BR")}</p>
      {hint && <p className="mt-1 text-[10px] opacity-70">{hint}</p>}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-muted/40 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}
