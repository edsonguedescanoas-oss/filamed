import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, PhoneCall, Users, Activity, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Fila = Database["public"]["Tables"]["filas"]["Row"];
type Senha = Database["public"]["Tables"]["senhas"]["Row"];

interface QueueCardsProps {
  unidadeId: string;
  filas: Fila[];
  canCall: boolean;
}

interface FilaStats {
  pendentes: Senha[];
  emAtendimento: number;
}

export function QueueCards({ unidadeId, filas, canCall }: QueueCardsProps) {
  const [statsByFila, setStatsByFila] = useState<Record<string, FilaStats>>({});
  const [loading, setLoading] = useState(true);
  const [callingFila, setCallingFila] = useState<string | null>(null);
  const lastCallAt = useRef<Record<string, number>>({});

  const filasAtivas = useMemo(() => filas.filter((f) => f.ativa), [filas]);

  const fetchStats = async () => {
    if (!unidadeId || filasAtivas.length === 0) {
      setStatsByFila({});
      setLoading(false);
      return;
    }
    const filaIds = filasAtivas.map((f) => f.id);
    const { data, error } = await supabase
      .from("senhas")
      .select("*")
      .eq("unidade_id", unidadeId)
      .in("fila_id", filaIds)
      .in("status", ["aguardando", "chamada", "em_atendimento"])
      .order("prioridade", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar status das filas: " + error.message);
      setLoading(false);
      return;
    }

    const map: Record<string, FilaStats> = {};
    for (const f of filasAtivas) map[f.id] = { pendentes: [], emAtendimento: 0 };
    for (const s of data ?? []) {
      const bucket = map[s.fila_id];
      if (!bucket) continue;
      if (s.status === "aguardando" || s.status === "chamada") {
        bucket.pendentes.push(s as Senha);
      } else if (s.status === "em_atendimento") {
        bucket.emAtendimento += 1;
      }
    }
    setStatsByFila(map);
    setLoading(false);
  };

  useEffect(() => {
    void fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidadeId, filas.map((f) => f.id + f.ativa).join(",")]);

  // realtime
  useEffect(() => {
    if (!unidadeId) return;
    const channel = supabase
      .channel(`filas-stats-${unidadeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "senhas",
          filter: `unidade_id=eq.${unidadeId}`,
        },
        () => void fetchStats(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidadeId, filasAtivas.length]);

  const handleChamarProximo = async (fila: Fila) => {
    if (!canCall) return;
    // debounce 1s por fila
    const now = Date.now();
    const last = lastCallAt.current[fila.id] ?? 0;
    if (now - last < 1000) {
      toast.info("Aguarde um instante antes de chamar de novo");
      return;
    }
    lastCallAt.current[fila.id] = now;

    const stats = statsByFila[fila.id];
    const proxima = stats?.pendentes[0];
    if (!proxima) {
      toast.error("Nenhuma senha aguardando nesta fila");
      return;
    }

    setCallingFila(fila.id);
    try {
      const { error: updErr } = await supabase
        .from("senhas")
        .update({ status: "chamada", updated_at: new Date().toISOString() })
        .eq("id", proxima.id);
      if (updErr) throw updErr;

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;

      const { error: chamErr } = await supabase.from("chamadas").insert({
        unidade_id: unidadeId,
        senha_id: proxima.id,
        chamado_por: userId,
        destino: fila.nome,
      });
      if (chamErr) throw chamErr;

      toast.success(`Chamando ${proxima.codigo}`, {
        description: `Fila ${fila.nome}`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao chamar próximo";
      toast.error(msg);
    } finally {
      setCallingFila(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (filasAtivas.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {filasAtivas.map((fila) => (
        <QueueCard
          key={fila.id}
          fila={fila}
          stats={statsByFila[fila.id]}
          canCall={canCall}
          calling={callingFila === fila.id}
          onCall={() => void handleChamarProximo(fila)}
        />
      ))}
    </div>
  );
}

function QueueCard({
  fila,
  stats,
  canCall,
  calling,
  onCall,
}: {
  fila: Fila;
  stats?: FilaStats;
  canCall: boolean;
  calling: boolean;
  onCall: () => void;
}) {
  const pendentes = stats?.pendentes ?? [];
  const emAtendimento = stats?.emAtendimento ?? 0;
  const cor = fila.cor ?? "#3B82F6";
  const proximas = pendentes.slice(0, 3);
  const disabled = !canCall || calling || pendentes.length === 0;

  return (
    <div
      className="group relative flex flex-col rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:shadow-glow"
      style={{ borderTopColor: cor, borderTopWidth: 3 }}
    >
      {/* header */}
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white font-bold text-sm shadow-soft"
          style={{ backgroundColor: cor }}
        >
          {fila.prefixo_senha}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-semibold truncate">{fila.nome}</h3>
          <p className="text-xs text-muted-foreground capitalize">{fila.tipo}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Ativa
        </span>
      </div>

      {/* stats */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Stat
          icon={<Users className="h-3.5 w-3.5" />}
          label="Pendentes"
          value={pendentes.length}
          accent="text-foreground"
        />
        <Stat
          icon={<Activity className="h-3.5 w-3.5" />}
          label="Em atend."
          value={emAtendimento}
          accent={emAtendimento > 0 ? "text-primary" : "text-foreground"}
        />
      </div>

      {/* próximas */}
      <div className="mt-4 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Próximas senhas
        </p>
        {proximas.length === 0 ? (
          <div className="mt-2 rounded-lg border border-dashed border-border bg-muted/20 px-3 py-4 text-center">
            <p className="text-xs text-muted-foreground">Sem senhas aguardando</p>
          </div>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {proximas.map((s, idx) => (
              <li
                key={s.id}
                className={cn(
                  "flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-3 py-2",
                  idx === 0 && "border-primary/40 bg-primary/5",
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      "font-mono text-sm font-bold",
                      idx === 0 ? "text-primary" : "text-foreground",
                    )}
                  >
                    {s.codigo}
                  </span>
                  {s.prioridade !== "normal" && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-5 px-1.5 text-[10px] capitalize",
                        s.prioridade === "urgente"
                          ? "border-destructive/40 text-destructive"
                          : "border-primary/40 text-primary",
                      )}
                    >
                      {s.prioridade}
                    </Badge>
                  )}
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-mono tabular-nums">
                  <Clock className="h-3 w-3" />
                  {format(new Date(s.created_at), "HH:mm", { locale: ptBR })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* CTA */}
      {canCall && (
        <Button
          onClick={onCall}
          disabled={disabled}
          className="mt-4 w-full bg-gradient-primary shadow-soft"
        >
          {calling ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Chamando…
            </>
          ) : (
            <>
              <PhoneCall className="h-4 w-4" />
              Chamar próximo
            </>
          )}
        </Button>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className={cn("mt-0.5 font-display text-xl font-bold tabular-nums", accent)}>
        {value}
      </p>
    </div>
  );
}
