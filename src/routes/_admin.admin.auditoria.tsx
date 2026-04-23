import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Loader2,
  Filter,
  ListTree,
  PhoneCall,
  Send,
  AlertTriangle,
  Building2,
  User as UserIcon,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_admin/admin/auditoria")({
  head: () => ({
    meta: [{ title: "Admin · Auditoria — FilaMed" }],
  }),
  component: AdminAuditoriaPage,
});

interface AuditoriaRow {
  id: string;
  unidade_id: string | null;
  unidade_nome: string | null;
  entidade: string;
  acao: string;
  entidade_id: string | null;
  ator_id: string | null;
  ator_nome: string | null;
  resumo: string;
  dados_antes: Record<string, unknown> | null;
  dados_depois: Record<string, unknown> | null;
  created_at: string;
}

interface UnidadeOpt {
  id: string;
  nome: string;
}

const ENTIDADES = [
  { value: "todas", label: "Todas as entidades" },
  { value: "fila", label: "Filas" },
  { value: "chamada", label: "Chamadas" },
  { value: "notificacao", label: "Notificações" },
];

const PERIODOS = [
  { value: "24h", label: "Últimas 24h" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "tudo", label: "Todo o histórico" },
];

function periodoDesde(p: string): string | null {
  const now = Date.now();
  switch (p) {
    case "24h":
      return new Date(now - 24 * 3600 * 1000).toISOString();
    case "7d":
      return new Date(now - 7 * 86400 * 1000).toISOString();
    case "30d":
      return new Date(now - 30 * 86400 * 1000).toISOString();
    default:
      return null;
  }
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function entidadeMeta(entidade: string, acao: string) {
  if (entidade === "fila") {
    return {
      icon: ListTree,
      label: "Fila",
      tone: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
    };
  }
  if (entidade === "chamada") {
    return {
      icon: PhoneCall,
      label: "Chamada",
      tone: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20",
    };
  }
  if (entidade === "notificacao") {
    if (acao === "falhar") {
      return {
        icon: AlertTriangle,
        label: "Notificação (falha)",
        tone: "bg-destructive/10 text-destructive border-destructive/20",
      };
    }
    return {
      icon: Send,
      label: "Notificação",
      tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    };
  }
  return {
    icon: Activity,
    label: entidade,
    tone: "bg-muted text-muted-foreground border-border",
  };
}

function AdminAuditoriaPage() {
  const [unidades, setUnidades] = useState<UnidadeOpt[]>([]);
  const [unidadeId, setUnidadeId] = useState<string>("todas");
  const [entidade, setEntidade] = useState<string>("todas");
  const [periodo, setPeriodo] = useState<string>("7d");
  const [eventos, setEventos] = useState<AuditoriaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Carrega unidades para o filtro
  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("unidades")
        .select("id, nome")
        .order("nome");
      if (data) setUnidades(data);
    })();
  }, []);

  // Carrega eventos sempre que filtros mudam
  useEffect(() => {
    let cancel = false;
    setLoading(true);
    void (async () => {
      const desde = periodoDesde(periodo);
      const { data, error } = await (
        supabase.rpc as unknown as (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: AuditoriaRow[] | null; error: unknown }>
      )("admin_listar_auditoria", {
        _unidade_id: unidadeId === "todas" ? null : unidadeId,
        _entidade: entidade === "todas" ? null : entidade,
        _desde: desde,
        _ate: null,
        _limite: 300,
      });
      if (cancel) return;
      if (error) {
        console.error(error);
        setEventos([]);
      } else {
        setEventos(data ?? []);
      }
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [unidadeId, entidade, periodo]);

  const stats = useMemo(() => {
    let filas = 0;
    let chamadas = 0;
    let notif_ok = 0;
    let notif_falha = 0;
    for (const e of eventos) {
      if (e.entidade === "fila") filas++;
      else if (e.entidade === "chamada") chamadas++;
      else if (e.entidade === "notificacao") {
        if (e.acao === "falhar") notif_falha++;
        else notif_ok++;
      }
    }
    return { filas, chamadas, notif_ok, notif_falha };
  }, [eventos]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Auditoria global</h1>
          <p className="text-sm text-muted-foreground">
            Trilha de eventos sensíveis do SaaS — mudanças em filas, chamadas e envio de notificações.
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <Activity className="h-3.5 w-3.5" />
          {eventos.length} evento{eventos.length === 1 ? "" : "s"}
        </Badge>
      </header>

      {/* Resumo */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ResumoCard icon={ListTree} label="Mudanças em filas" value={stats.filas} tone="text-sky-600" />
        <ResumoCard icon={PhoneCall} label="Chamadas" value={stats.chamadas} tone="text-violet-600" />
        <ResumoCard icon={Send} label="Notificações enviadas" value={stats.notif_ok} tone="text-emerald-600" />
        <ResumoCard
          icon={AlertTriangle}
          label="Notificações com falha"
          value={stats.notif_falha}
          tone="text-destructive"
          highlight={stats.notif_falha > 0}
        />
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
          <CardDescription>Refine a trilha por unidade, tipo de evento ou período.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Unidade</Label>
            <Select value={unidadeId} onValueChange={setUnidadeId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as unidades</SelectItem>
                {unidades.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Entidade</Label>
            <Select value={entidade} onValueChange={setEntidade}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTIDADES.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Período</Label>
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODOS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Trilha de eventos</CardTitle>
          <CardDescription>
            Ordenado do mais recente para o mais antigo. Clique para ver os detalhes do payload.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : eventos.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Nenhum evento encontrado para os filtros selecionados.
            </div>
          ) : (
            <ol className="divide-y divide-border">
              {eventos.map((ev) => {
                const meta = entidadeMeta(ev.entidade, ev.acao);
                const Icon = meta.icon;
                const isOpen = expanded.has(ev.id);
                const hasPayload = !!(ev.dados_antes || ev.dados_depois);
                return (
                  <li key={ev.id} className="py-3">
                    <button
                      type="button"
                      onClick={() => hasPayload && toggle(ev.id)}
                      className={`flex w-full items-start gap-3 text-left ${
                        hasPayload ? "cursor-pointer" : "cursor-default"
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${meta.tone}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={meta.tone}>
                            {meta.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{fmtDateTime(ev.created_at)}</span>
                        </div>
                        <p className="mt-1 text-sm font-medium leading-snug">{ev.resumo}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          {ev.unidade_nome && (
                            <span className="inline-flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {ev.unidade_nome}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <UserIcon className="h-3 w-3" />
                            {ev.ator_nome ?? (ev.ator_id ? "Usuário" : "Sistema")}
                          </span>
                        </div>
                      </div>
                      {hasPayload && (
                        <span className="mt-1 text-muted-foreground">
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </span>
                      )}
                    </button>

                    {isOpen && hasPayload && (
                      <div className="mt-3 ml-12 grid gap-3 sm:grid-cols-2">
                        {ev.dados_antes && (
                          <PayloadBlock title="Antes" data={ev.dados_antes} />
                        )}
                        {ev.dados_depois && (
                          <PayloadBlock title="Depois" data={ev.dados_depois} />
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
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
  highlight,
}: {
  icon: typeof Activity;
  label: string;
  value: number;
  tone: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border bg-card p-4 ${
        highlight && value > 0 ? "border-destructive/40" : "border-border"
      }`}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className={`h-4 w-4 ${tone}`} />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className={`mt-2 text-2xl font-bold ${highlight && value > 0 ? "text-destructive" : ""}`}>
        {value.toLocaleString("pt-BR")}
      </p>
    </div>
  );
}

function PayloadBlock({ title, data }: { title: string; data: Record<string, unknown> }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 p-3">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-snug text-foreground/80">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
