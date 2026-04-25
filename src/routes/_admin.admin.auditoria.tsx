import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
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
  Search,
  Download,
  CreditCard,
  Power,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuditoriaDiff } from "@/components/admin/auditoria-diff";
import { trackEvent } from "@/lib/analytics";

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
  { value: "movimentacao_fila", label: "Movimentações de Fila" },
  { value: "senhas", label: "Senhas (todas)" },
  { value: "assinatura", label: "Assinaturas / Planos" },
  { value: "unidade", label: "Unidades (suspensão/reativação)" },
  { value: "fila", label: "Filas (configuração)" },
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
  if (entidade === "assinatura") {
    return {
      icon: CreditCard,
      label: "Assinatura",
      tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    };
  }
  if (entidade === "unidade") {
    const isSuspender = acao === "suspender";
    return {
      icon: Power,
      label: isSuspender ? "Unidade suspensa" : "Unidade",
      tone: isSuspender
        ? "bg-destructive/10 text-destructive border-destructive/20"
        : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
    };
  }
  return {
    icon: Activity,
    label: entidade,
    tone: "bg-muted text-muted-foreground border-border",
  };
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "string" ? value : JSON.stringify(value);
  if (/[",\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function exportarCsv(rows: AuditoriaRow[]) {
  trackEvent("download_report", { format: "CSV", type: "admin_audit_log" });
  const headers = [
    "data",
    "entidade",
    "acao",
    "unidade",
    "ator",
    "resumo",
    "dados_antes",
    "dados_depois",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        escapeCsv(new Date(r.created_at).toISOString()),
        escapeCsv(r.entidade),
        escapeCsv(r.acao),
        escapeCsv(r.unidade_nome ?? ""),
        escapeCsv(r.ator_nome ?? (r.ator_id ? "Usuário" : "Sistema")),
        escapeCsv(r.resumo),
        escapeCsv(r.dados_antes ?? ""),
        escapeCsv(r.dados_depois ?? ""),
      ].join(","),
    );
  }
  const csv = "\uFEFF" + lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const PAGE_SIZE = 50;

function AdminAuditoriaPage() {
  const [unidades, setUnidades] = useState<UnidadeOpt[]>([]);
  const [unidadeId, setUnidadeId] = useState<string>("todas");
  const [entidade, setEntidade] = useState<string>("todas");
  const [periodo, setPeriodo] = useState<string>("7d");
  const [busca, setBusca] = useState<string>("");
  const [buscaDebounced, setBuscaDebounced] = useState<string>("");
  const [eventos, setEventos] = useState<AuditoriaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Token para invalidar requests obsoletas (filtros mudaram durante fetch).
  const reqIdRef = useRef(0);

  // Debounce da busca textual
  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca.trim()), 300);
    return () => clearTimeout(t);
  }, [busca]);

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

  // Função de fetch paginada — usa created_at do último item como cursor (_ate).
  const fetchPage = useCallback(
    async (cursorAte: string | null, reqId: number) => {
      const desde = periodoDesde(periodo);
      const { data, error } = await (
        supabase.rpc as unknown as (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: AuditoriaRow[] | null; error: unknown }>
      )("admin_listar_auditoria", {
        _unidade_id: unidadeId === "todas" ? null : unidadeId,
        _entidade:
          entidade === "todas"
            ? null
            : entidade === "movimentacao_fila"
              ? "senhas"
              : entidade,
        _desde: desde,
        _ate: cursorAte,
        _limite: PAGE_SIZE,
        _busca: buscaDebounced || null,
        _ator_id: null,
      });

      if (reqId !== reqIdRef.current) return null; // request obsoleta
      if (error) {
        console.error(error);
        return [];
      }

      const rows = data ?? [];
      if (entidade === "movimentacao_fila") {
        return rows.filter(
          (r) =>
            r.acao === "mover_senha_de_fila" ||
            (r.dados_depois as Record<string, unknown>)?.tipo === "movimentacao_fila",
        );
      }
      return rows;
    },
    [unidadeId, entidade, periodo, buscaDebounced],
  );

  // Reload inicial sempre que filtros mudam
  useEffect(() => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setHasMore(true);
    setExpanded(new Set());
    void (async () => {
      const rows = await fetchPage(null, reqId);
      if (rows === null) return;
      setEventos(rows);
      setHasMore(rows.length === PAGE_SIZE);
      setLoading(false);
    })();
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || !hasMore || eventos.length === 0) return;
    const last = eventos[eventos.length - 1];
    // Cursor: created_at do último item; subtrai 1ms para evitar duplicar borda.
    const cursorMs = new Date(last.created_at).getTime() - 1;
    const cursor = new Date(cursorMs).toISOString();
    setLoadingMore(true);
    const reqId = reqIdRef.current;
    const rows = await fetchPage(cursor, reqId);
    if (rows === null) {
      setLoadingMore(false);
      return;
    }
    setEventos((prev) => {
      const seen = new Set(prev.map((p) => p.id));
      const fresh = rows.filter((r) => !seen.has(r.id));
      return [...prev, ...fresh];
    });
    setHasMore(rows.length === PAGE_SIZE);
    setLoadingMore(false);
  }, [eventos, fetchPage, hasMore, loading, loadingMore]);

  const stats = useMemo(() => {
    let assinatura = 0;
    let unidade = 0;
    let chamadas = 0;
    let notif_ok = 0;
    let notif_falha = 0;
    for (const e of eventos) {
      if (e.entidade === "assinatura") assinatura++;
      else if (e.entidade === "unidade") unidade++;
      else if (e.entidade === "chamada") chamadas++;
      else if (e.entidade === "notificacao") {
        if (e.acao === "falhar") notif_falha++;
        else notif_ok++;
      }
    }
    return { assinatura, unidade, chamadas, notif_ok, notif_falha };
  }, [eventos]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Virtualização da lista
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const itemCount = eventos.length + (hasMore || loadingMore ? 1 : 0);
  const virtualizer = useVirtualizer({
    count: itemCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
      if (index >= eventos.length) return 64;
      const ev = eventos[index];
      return expanded.has(ev.id) ? 360 : 96;
    },
    overscan: 6,
    getItemKey: (index) =>
      index >= eventos.length ? "__sentinel__" : eventos[index].id,
  });

  // Trigger de load-more quando o sentinela aparece
  const virtualItems = virtualizer.getVirtualItems();
  useEffect(() => {
    const last = virtualItems[virtualItems.length - 1];
    if (!last) return;
    if (last.index >= eventos.length && hasMore && !loadingMore && !loading) {
      void loadMore();
    }
  }, [virtualItems, eventos.length, hasMore, loadingMore, loading, loadMore]);

  // Re-mede quando expanded muda (alturas variam)
  useEffect(() => {
    virtualizer.measure();
  }, [expanded, virtualizer]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Auditoria global</h1>
          <p className="text-sm text-muted-foreground">
            Trilha de eventos críticos do SaaS — mudanças de plano, suspensões, falhas de integração e operações por unidade.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            {eventos.length}
            {hasMore ? "+" : ""} evento{eventos.length === 1 ? "" : "s"} carregado
            {eventos.length === 1 ? "" : "s"}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportarCsv(eventos)}
            disabled={loading || eventos.length === 0}
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </header>

      {/* Resumo */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <ResumoCard icon={CreditCard} label="Planos / Assinaturas" value={stats.assinatura} tone="text-amber-600" />
        <ResumoCard icon={Power} label="Suspensões / Unidades" value={stats.unidade} tone="text-indigo-600" />
        <ResumoCard icon={PhoneCall} label="Chamadas" value={stats.chamadas} tone="text-violet-600" />
        <ResumoCard icon={Send} label="Notificações enviadas" value={stats.notif_ok} tone="text-emerald-600" />
        <ResumoCard
          icon={AlertTriangle}
          label="Falhas de integração"
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
          <CardDescription>Refine a trilha por unidade, tipo de evento, período ou busca textual.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5 lg:col-span-1">
            <Label className="text-xs">Buscar</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="resumo, unidade, ator…"
                className="pl-8"
              />
            </div>
          </div>
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
            Ordenado do mais recente para o mais antigo. Clique para ver os detalhes do payload. A
            lista carrega mais registros automaticamente conforme você rola.
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
            <div
              ref={scrollRef}
              className="relative max-h-[70vh] min-h-[400px] overflow-auto rounded-md border border-border"
            >
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {virtualItems.map((vRow) => {
                  const isSentinel = vRow.index >= eventos.length;
                  return (
                    <div
                      key={vRow.key}
                      data-index={vRow.index}
                      ref={virtualizer.measureElement}
                      className="absolute left-0 top-0 w-full border-b border-border last:border-b-0"
                      style={{ transform: `translateY(${vRow.start}px)` }}
                    >
                      {isSentinel ? (
                        <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                          {hasMore ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Carregando mais eventos…
                            </>
                          ) : (
                            <span>Fim da lista</span>
                          )}
                        </div>
                      ) : (
                        (() => {
                          const ev = eventos[vRow.index];
                          const meta = entidadeMeta(ev.entidade, ev.acao);
                          const Icon = meta.icon;
                          const isOpen = expanded.has(ev.id);
                          const hasPayload = !!(ev.dados_antes || ev.dados_depois);
                          return (
                            <div className="px-3 py-3">
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
                                    <span className="text-xs text-muted-foreground">
                                      {fmtDateTime(ev.created_at)}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-sm font-medium leading-snug">
                                    {ev.resumo}
                                  </p>
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
                                    {isOpen ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </span>
                                )}
                              </button>

                              {isOpen && hasPayload && (
                                <div className="mt-3 ml-12">
                                  <AuditoriaDiff
                                    before={ev.dados_antes}
                                    after={ev.dados_depois}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })()
                      )}
                    </div>
                  );
                })}
              </div>
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

