import { useCallback, useEffect, useState } from "react";
import {
  Tv,
  Mic2,
  MessageCircle,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  PlayCircle,
  Loader2,
  XCircle,
  Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

interface TvDiag {
  configurado: boolean;
  logo_url: string | null;
  resolucao: string | null;
  aspect_ratio: string | null;
  ultima_atualizacao: string | null;
  midias_ativas: number;
  ultima_chamada: string | null;
  chamadas_24h: number;
}

interface VozDiag {
  configurado: boolean;
  provider: string;
  voice_id: string | null;
  ultima_atualizacao: string | null;
  cache_limpezas_7d: number;
  cache_erros_7d: number;
  ultimo_erro_cache: string | null;
}

interface ErroExemplo {
  created_at: string;
  destinatario: string;
  erro: string;
  tentativas: number;
}

interface CanalMsg {
  canal: string;
  total_24h: number;
  enviadas_24h: number;
  falhas_24h: number;
  falhas_7d: number;
  taxa_sucesso_24h: number | null;
  latencia_media_ms: number | null;
  ultima_enviada: string | null;
  ultima_falha: string | null;
  erros_recentes: ErroExemplo[];
}

interface MsgDiag {
  whatsapp_configurado: boolean | null;
  canais: CanalMsg[];
}

interface Diagnostico {
  tv: TvDiag;
  voz: VozDiag;
  mensageria: MsgDiag;
  gerado_em: string;
}

const CANAL_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  telegram: "Telegram",
  email: "Email",
  push: "Push",
};

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h atrás`;
  const d = Math.floor(h / 24);
  return `${d} d atrás`;
}

function statusFromTaxa(taxa: number | null): { label: string; variant: "ok" | "warn" | "crit" | "neutro" } {
  if (taxa === null) return { label: "Sem dados", variant: "neutro" };
  if (taxa >= 95) return { label: "Saudável", variant: "ok" };
  if (taxa >= 80) return { label: "Atenção", variant: "warn" };
  return { label: "Crítico", variant: "crit" };
}

const variantClass: Record<string, string> = {
  ok: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  warn: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  crit: "bg-destructive/10 text-destructive border-destructive/20",
  neutro: "bg-muted text-muted-foreground border-border",
};

export function CanaisDiagnostico({ unidadeId }: { unidadeId: string }) {
  const [diag, setDiag] = useState<Diagnostico | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [testandoVoz, setTestandoVoz] = useState(false);
  const [testandoMsg, setTestandoMsg] = useState(false);

  const carregar = useCallback(async () => {
    setRefreshing(true);
    const { data, error } = await (
      supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: Diagnostico | null; error: { message: string } | null }>
    )("admin_unidade_canais_diagnostico", { _unidade_id: unidadeId });
    if (error) {
      toast.error("Falha ao carregar diagnóstico", { description: error.message });
    } else if (data) {
      setDiag(data);
    }
    setLoading(false);
    setRefreshing(false);
  }, [unidadeId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Teste real do TTS via edge function (com payload mínimo)
  const testarVoz = async () => {
    if (!diag) return;
    setTestandoVoz(true);
    const t0 = performance.now();
    try {
      const { data, error } = await supabase.functions.invoke("tts", {
        body: {
          text: ".",
          provider: diag.voz.provider,
          voiceId: diag.voz.voice_id,
          rate: 1.0,
          pitch: 1.0,
        },
      });
      const ms = Math.round(performance.now() - t0);
      if (error) {
        toast.error(`Voz: falha (${ms} ms)`, { description: error.message });
      } else if (!data?.audioContent && data?.fallback === "browser") {
        toast.warning(`Voz: provedor indisponível, fallback navegador (${ms} ms)`, {
          description: data.reason ?? "fallback",
        });
      } else if (!data?.audioContent) {
        toast.error(`Voz: sem áudio retornado (${ms} ms)`);
      } else {
        toast.success(`Voz OK em ${ms} ms`, { description: `Provedor: ${diag.voz.provider}` });
      }
    } catch (err) {
      toast.error("Voz: erro inesperado", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setTestandoVoz(false);
    }
  };

  // Teste do canal de mensageria via edge function existente (wa-duck-notify ping)
  const testarMensageria = async () => {
    setTestandoMsg(true);
    const t0 = performance.now();
    try {
      const { data, error } = await supabase.functions.invoke("wa-duck-notify", {
        body: { ping: true, unidade_id: unidadeId },
      });
      const ms = Math.round(performance.now() - t0);
      if (error) {
        toast.error(`Mensageria: falha (${ms} ms)`, { description: error.message });
      } else {
        toast.success(`Mensageria respondeu em ${ms} ms`, {
          description: data?.message ?? "Endpoint acessível",
        });
      }
    } catch (err) {
      toast.error("Mensageria: erro inesperado", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setTestandoMsg(false);
    }
  };

  if (loading) {
    return (
      <Card className="lg:col-span-3">
        <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!diag) return null;

  return (
    <TooltipProvider>
      <Card className="lg:col-span-3">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Diagnóstico por canal</CardTitle>
            <CardDescription>
              Latência, erros e saúde de TV, voz e mensageria — atualizado{" "}
              {formatRelative(diag.gerado_em)}.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={carregar} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* TV */}
          <CanalSection
            icon={Tv}
            titulo="Painel de TV"
            badge={
              diag.tv.chamadas_24h > 0
                ? { label: "Ativo", variant: "ok" }
                : diag.tv.configurado
                  ? { label: "Configurado", variant: "neutro" }
                  : { label: "Padrão", variant: "neutro" }
            }
          >
            <div className="grid gap-3 sm:grid-cols-4">
              <Metric label="Resolução" value={diag.tv.resolucao?.toUpperCase() ?? "FHD"} />
              <Metric label="Aspect" value={diag.tv.aspect_ratio ?? "16:9"} />
              <Metric label="Mídias ativas" value={String(diag.tv.midias_ativas)} />
              <Metric label="Chamadas (24h)" value={String(diag.tv.chamadas_24h)} />
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Última chamada: {formatRelative(diag.tv.ultima_chamada)} · Config atualizada:{" "}
              {formatRelative(diag.tv.ultima_atualizacao)}
            </div>
          </CanalSection>

          {/* Voz */}
          <CanalSection
            icon={Mic2}
            titulo="Voz / TTS"
            badge={
              diag.voz.cache_erros_7d > 0
                ? { label: `${diag.voz.cache_erros_7d} erros 7d`, variant: "warn" }
                : diag.voz.configurado
                  ? { label: diag.voz.provider, variant: "ok" }
                  : { label: "Navegador", variant: "neutro" }
            }
            acao={
              <Button size="sm" variant="outline" onClick={testarVoz} disabled={testandoVoz}>
                {testandoVoz ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <PlayCircle className="h-3.5 w-3.5" />
                )}
                Testar conexão
              </Button>
            }
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="Provedor" value={diag.voz.provider} />
              <Metric label="Voice ID" value={diag.voz.voice_id ?? "—"} />
              <Metric label="Limpezas cache (7d)" value={String(diag.voz.cache_limpezas_7d)} />
            </div>
            {diag.voz.ultimo_erro_cache && (
              <div className="mt-3 rounded-md border border-amber-500/20 bg-amber-500/5 p-3 text-xs">
                <div className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Último erro de cache
                </div>
                <p className="mt-1 font-mono text-muted-foreground">{diag.voz.ultimo_erro_cache}</p>
              </div>
            )}
          </CanalSection>

          {/* Mensageria */}
          <CanalSection
            icon={MessageCircle}
            titulo="Mensageria (WhatsApp / SMS / Telegram)"
            badge={
              diag.mensageria.whatsapp_configurado
                ? { label: "WhatsApp ativo", variant: "ok" }
                : { label: "Não configurado", variant: "neutro" }
            }
            acao={
              <Button size="sm" variant="outline" onClick={testarMensageria} disabled={testandoMsg}>
                {testandoMsg ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <PlayCircle className="h-3.5 w-3.5" />
                )}
                Testar endpoint
              </Button>
            }
          >
            {diag.mensageria.canais.length === 0 ? (
              <div className="flex items-center gap-2 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5" />
                Nenhuma notificação enviada nas últimas 24h.
              </div>
            ) : (
              <div className="space-y-3">
                {diag.mensageria.canais.map((c) => {
                  const status = statusFromTaxa(c.taxa_sucesso_24h);
                  return (
                    <div key={c.canal} className="rounded-lg border border-border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{CANAL_LABEL[c.canal] ?? c.canal}</span>
                          <Badge variant="outline" className={variantClass[status.variant]}>
                            {status.variant === "ok" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                            {status.variant === "crit" && <XCircle className="mr-1 h-3 w-3" />}
                            {status.variant === "warn" && <AlertTriangle className="mr-1 h-3 w-3" />}
                            {status.label}
                            {c.taxa_sucesso_24h !== null && ` · ${c.taxa_sucesso_24h}%`}
                          </Badge>
                        </div>
                        {c.latencia_media_ms !== null && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Zap className="h-3 w-3" />
                                {c.latencia_media_ms} ms
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              Latência média (criação → envio confirmado) nas últimas 24h
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <div className="mt-2 grid gap-2 text-xs sm:grid-cols-4">
                        <MiniStat label="Total 24h" value={c.total_24h} />
                        <MiniStat label="Enviadas" value={c.enviadas_24h} positive />
                        <MiniStat label="Falhas 24h" value={c.falhas_24h} negative={c.falhas_24h > 0} />
                        <MiniStat label="Falhas 7d" value={c.falhas_7d} negative={c.falhas_7d > 0} />
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          última: {formatRelative(c.ultima_enviada)}
                        </span>
                        {c.ultima_falha && (
                          <span className="inline-flex items-center gap-1">
                            <XCircle className="h-3 w-3 text-destructive" />
                            falha: {formatRelative(c.ultima_falha)}
                          </span>
                        )}
                      </div>

                      {c.erros_recentes.length > 0 && (
                        <details className="mt-3 group">
                          <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                            Ver {c.erros_recentes.length} erro(s) recente(s)
                          </summary>
                          <div className="mt-2 space-y-1.5">
                            {c.erros_recentes.map((e, i) => (
                              <div
                                key={i}
                                className="rounded border border-destructive/20 bg-destructive/5 p-2 text-xs"
                              >
                                <div className="flex justify-between text-muted-foreground">
                                  <span className="font-mono">{e.destinatario}</span>
                                  <span>
                                    {formatRelative(e.created_at)} · {e.tentativas}x
                                  </span>
                                </div>
                                <p className="mt-1 font-mono text-destructive">{e.erro}</p>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CanalSection>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

function CanalSection({
  icon: Icon,
  titulo,
  badge,
  acao,
  children,
}: {
  icon: typeof Tv;
  titulo: string;
  badge: { label: string; variant: "ok" | "warn" | "crit" | "neutro" };
  acao?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <span className="font-semibold">{titulo}</span>
          <Badge variant="outline" className={variantClass[badge.variant]}>
            {badge.label}
          </Badge>
        </div>
        {acao}
      </div>
      {children}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium" title={value}>
        {value}
      </p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  positive,
  negative,
}: {
  label: string;
  value: number;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded bg-muted/30 px-2 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`font-semibold ${
          negative ? "text-destructive" : positive ? "text-emerald-600 dark:text-emerald-400" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
