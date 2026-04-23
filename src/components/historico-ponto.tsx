/**
 * Histórico unificado por ponto de atendimento.
 *
 * Mostra timeline com chamadas + finalizações para o(s) ponto(s) escolhido(s),
 * com busca por código de senha e filtro por período. Usado em /app/guiche
 * (recepção vê o histórico do guichê) e em /app/pontos (admin vê tudo da unidade).
 *
 * Fonte: RPC `historico_ponto_atendimento` — junta `chamadas` e `atendimentos`
 * com permissão por unidade (RLS via SECURITY DEFINER).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Megaphone,
  CheckCircle2,
  Search,
  RefreshCw,
  Filter,
  History,
  User as UserIcon,
  MapPin,
  Clock4,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type PontoTipo = Database["public"]["Enums"]["ponto_tipo"];

type PontoOption = {
  id: string;
  nome: string;
  tipo: PontoTipo;
};

type EventoHistorico = {
  evento_tipo: "chamada" | "finalizacao";
  evento_id: string;
  ocorrido_em: string;
  ponto_id: string | null;
  ponto_nome: string | null;
  senha_id: string;
  senha_codigo: string;
  fila_nome: string | null;
  paciente_nome: string | null;
  atendente_id: string | null;
  atendente_nome: string | null;
  duracao_segundos: number | null;
  observacoes: string | null;
  requer_retorno: boolean | null;
};

type Periodo = "hoje" | "7d" | "30d" | "tudo";

type Props = {
  unidadeId: string;
  /** Restringe o seletor a alguns tipos de ponto (ex: só guichês). */
  tiposPermitidos?: PontoTipo[];
  /** Pré-seleciona um ponto (e fixa — esconde o select). */
  pontoFixoId?: string;
  /** Título do bloco. Default: "Histórico do ponto". */
  titulo?: string;
};

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: "hoje", label: "Hoje" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "tudo", label: "Sem limite" },
];

function calcDesde(p: Periodo): string | null {
  const now = new Date();
  if (p === "hoje") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }
  if (p === "7d") return new Date(now.getTime() - 7 * 86400000).toISOString();
  if (p === "30d") return new Date(now.getTime() - 30 * 86400000).toISOString();
  return null;
}

function formatDataHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuracao(seg: number | null): string {
  if (seg == null || seg < 0) return "—";
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export function HistoricoPonto({
  unidadeId,
  tiposPermitidos,
  pontoFixoId,
  titulo = "Histórico do ponto",
}: Props) {
  const [pontos, setPontos] = useState<PontoOption[]>([]);
  const [pontoSel, setPontoSel] = useState<string>(pontoFixoId ?? "__todos__");
  const [periodo, setPeriodo] = useState<Periodo>("hoje");
  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [eventos, setEventos] = useState<EventoHistorico[]>([]);
  const [loading, setLoading] = useState(false);

  // Carrega pontos disponíveis para o select
  useEffect(() => {
    if (pontoFixoId) return; // select escondido nesse caso
    let cancelado = false;
    (async () => {
      let q = supabase
        .from("pontos_atendimento")
        .select("id,nome,tipo")
        .eq("unidade_id", unidadeId)
        .order("nome");
      if (tiposPermitidos && tiposPermitidos.length > 0) {
        q = q.in("tipo", tiposPermitidos);
      }
      const { data, error } = await q;
      if (cancelado) return;
      if (error) {
        toast.error("Erro ao listar pontos: " + error.message);
        return;
      }
      setPontos((data ?? []) as PontoOption[]);
    })();
    return () => {
      cancelado = true;
    };
  }, [unidadeId, tiposPermitidos, pontoFixoId]);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const desde = calcDesde(periodo);
      const pontoIdParam =
        pontoFixoId ?? (pontoSel !== "__todos__" ? pontoSel : undefined);
      // RPC aceita null no banco mas o tipo gerado exige string | undefined.
      // Passamos undefined para parâmetros opcionais não preenchidos.
      const { data, error } = await supabase.rpc("historico_ponto_atendimento", {
        _unidade_id: unidadeId,
        _ponto_id: pontoIdParam,
        _busca: buscaAplicada || undefined,
        _desde: desde ?? undefined,
        _limite: 200,
      });
      if (error) throw error;
      setEventos((data ?? []) as EventoHistorico[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao carregar histórico.");
      setEventos([]);
    } finally {
      setLoading(false);
    }
  }, [unidadeId, pontoFixoId, pontoSel, buscaAplicada, periodo]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    setBuscaAplicada(busca.trim());
  };

  const limparFiltros = () => {
    setBusca("");
    setBuscaAplicada("");
    setPeriodo("hoje");
    if (!pontoFixoId) setPontoSel("__todos__");
  };

  const resumo = useMemo(() => {
    const chamadas = eventos.filter((e) => e.evento_tipo === "chamada").length;
    const finalizadas = eventos.filter((e) => e.evento_tipo === "finalizacao").length;
    return { chamadas, finalizadas };
  }, [eventos]);

  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      <header className="px-5 py-3 border-b border-border bg-muted/20 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <span className="font-display font-semibold">{titulo}</span>
          <Badge variant="outline" className="text-[10px]">
            {eventos.length}
          </Badge>
          {!loading && eventos.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {resumo.chamadas} chamadas · {resumo.finalizadas} finalizações
            </span>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={() => void carregar()} disabled={loading}>
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Atualizar
        </Button>
      </header>

      {/* Filtros */}
      <div className="px-5 py-3 border-b border-border bg-background/40 grid gap-3 md:grid-cols-[1fr_auto_auto_auto] items-end">
        <form onSubmit={handleBuscar} className="space-y-1.5">
          <Label htmlFor="hist-busca" className="text-xs text-muted-foreground">
            Buscar por código de senha
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="hist-busca"
              placeholder="Ex: G015, C003"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </form>

        {!pontoFixoId && (
          <div className="space-y-1.5 min-w-[180px]">
            <Label className="text-xs text-muted-foreground">Ponto</Label>
            <Select value={pontoSel} onValueChange={setPontoSel}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__todos__">Todos os pontos</SelectItem>
                {pontos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5 min-w-[150px]">
          <Label className="text-xs text-muted-foreground">Período</Label>
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
            <SelectTrigger className="h-9">
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

        <Button
          variant="ghost"
          size="sm"
          onClick={limparFiltros}
          disabled={loading}
          className="h-9"
          title="Limpar filtros"
        >
          <Filter className="h-3.5 w-3.5" />
          Limpar
        </Button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : eventos.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-muted-foreground">
          Nenhum evento encontrado para os filtros selecionados.
        </div>
      ) : (
        <ul className="divide-y divide-border max-h-[640px] overflow-y-auto">
          {eventos.map((ev) => {
            const isChamada = ev.evento_tipo === "chamada";
            return (
              <li key={`${ev.evento_tipo}-${ev.evento_id}`} className="px-5 py-3 hover:bg-muted/20">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={cn(
                        "mt-0.5 flex h-7 w-7 items-center justify-center rounded-full shrink-0",
                        isChamada
                          ? "bg-primary/15 text-primary"
                          : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                      )}
                      title={isChamada ? "Chamada" : "Finalização"}
                    >
                      {isChamada ? (
                        <Megaphone className="h-3.5 w-3.5" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display text-base font-bold tabular-nums">
                          {ev.senha_codigo}
                        </span>
                        {ev.ponto_nome && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                            <MapPin className="h-3 w-3" />
                            {ev.ponto_nome}
                          </span>
                        )}
                        {ev.fila_nome && (
                          <Badge variant="outline" className="text-[10px]">
                            {ev.fila_nome}
                          </Badge>
                        )}
                        {ev.requer_retorno && (
                          <Badge className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
                            Retorno
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        {ev.paciente_nome && (
                          <span className="inline-flex items-center gap-1">
                            <UserIcon className="h-3 w-3" />
                            {ev.paciente_nome}
                          </span>
                        )}
                        {ev.atendente_nome && (
                          <span>
                            por <span className="font-medium">{ev.atendente_nome}</span>
                          </span>
                        )}
                        {!isChamada && (
                          <span className="inline-flex items-center gap-1">
                            <Clock4 className="h-3 w-3" />
                            {formatDuracao(ev.duracao_segundos)}
                          </span>
                        )}
                      </div>
                      {ev.observacoes && (
                        <p className="mt-1.5 text-xs text-foreground/70 italic line-clamp-2">
                          “{ev.observacoes}”
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDataHora(ev.ocorrido_em)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
