import { useEffect, useRef, useState } from "react";
import { Bug, Play, Pause, X, Zap, Volume2 } from "lucide-react";

type TestEvent = {
  at: Date;
  kind: "info" | "ok" | "warn" | "err";
  msg: string;
};

interface Props {
  /** Estado atual do "paused" passado ao carrossel. */
  carrosselPaused: boolean;
  /** Dispara uma chamada simulada de prioridade normal (flash lateral). */
  onSimularNormal: () => void;
  /** Dispara uma chamada simulada urgente/preferencial (modal fullscreen). */
  onSimularDestaque: () => void;
  /** Limpa qualquer chamada simulada ativa. */
  onLimpar: () => void;
  /** Fecha o painel de teste (volta `?test=1` para `?test=0`). */
  onFechar: () => void;
}

/**
 * Painel flutuante de diagnóstico exibido quando a TV está em modo de teste
 * (`?test=1`). Permite validar manualmente:
 *  - Se o YouTube está tocando em autoplay
 *  - Se o carrossel pausa quando uma chamada destacada (modal) sobe
 *  - Se ele retoma automaticamente depois que a chamada some
 *  - Se o áudio do TTS está sendo executado
 *
 * Não interfere com o fluxo real — apenas observa o `paused` do carrossel e
 * dispara chamadas simuladas via callbacks que o pai controla.
 */
export function TestModePanel({
  carrosselPaused,
  onSimularNormal,
  onSimularDestaque,
  onLimpar,
  onFechar,
}: Props) {
  const [logs, setLogs] = useState<TestEvent[]>([]);
  const [colapsado, setColapsado] = useState(false);
  const lastPausedRef = useRef<boolean>(carrosselPaused);

  const log = (kind: TestEvent["kind"], msg: string) => {
    setLogs((prev) =>
      [{ at: new Date(), kind, msg }, ...prev].slice(0, 20),
    );
  };

  // Observa transições do `paused` para auditar pause/resume
  useEffect(() => {
    if (lastPausedRef.current === carrosselPaused) return;
    lastPausedRef.current = carrosselPaused;
    if (carrosselPaused) {
      log("ok", "Carrossel PAUSADO (chamada destacada subiu)");
    } else {
      log("ok", "Carrossel RETOMADO (autoplay continua)");
    }
  }, [carrosselPaused]);

  // Auditoria de áudio na inicialização
  useEffect(() => {
    log("info", "Modo de teste ativo. Inicie um cenário pelos botões abaixo.");
  }, []);

  // Listener pra capturar erros do YouTube IFrame API
  useEffect(() => {
    const onMsg = (ev: MessageEvent) => {
      if (typeof ev.data !== "string") return;
      try {
        const data = JSON.parse(ev.data);
        if (data?.event === "infoDelivery" || data?.event === "onStateChange") {
          // YouTube state codes: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
          const state = data?.info?.playerState ?? data?.info;
          if (typeof state === "number") {
            const labels: Record<number, string> = {
              [-1]: "não iniciado",
              0: "encerrado",
              1: "tocando",
              2: "pausado",
              3: "buffering",
              5: "carregado",
            };
            const label = labels[state] ?? `state=${state}`;
            log(state === 1 ? "ok" : state === 2 ? "info" : "warn", `YouTube: ${label}`);
          }
        }
        if (data?.event === "onError") {
          log("err", `YouTube erro: code=${data?.info ?? "?"}`);
        }
      } catch {
        /* ignora payloads não-JSON do YT */
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  return (
    <div className="fixed bottom-4 left-4 z-[9999] w-[360px] max-w-[92vw] rounded-2xl border border-amber-400/40 bg-slate-950/95 text-white shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
            <Bug className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-amber-300">
              Modo de teste
            </div>
            <div className="text-[10px] text-white/50">Diagnóstico do painel TV</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setColapsado((v) => !v)}
            className="rounded px-2 py-1 text-[10px] font-medium text-white/70 hover:bg-white/10"
          >
            {colapsado ? "Expandir" : "Recolher"}
          </button>
          <button
            type="button"
            onClick={onFechar}
            className="rounded p-1 text-white/70 hover:bg-white/10"
            aria-label="Fechar modo de teste"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!colapsado && (
        <div className="space-y-3 p-3">
          {/* Status do carrossel */}
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <span className="text-xs font-medium text-white/70">
              Estado do carrossel
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                carrosselPaused
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-emerald-500/20 text-emerald-300"
              }`}
            >
              {carrosselPaused ? (
                <>
                  <Pause className="h-3 w-3" /> Pausado
                </>
              ) : (
                <>
                  <Play className="h-3 w-3" /> Tocando
                </>
              )}
            </span>
          </div>

          {/* Ações */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                log("info", "Disparando chamada NORMAL (flash lateral)");
                onSimularNormal();
              }}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-[11px] font-semibold hover:bg-white/10"
            >
              <Volume2 className="h-3.5 w-3.5" />
              Normal (flash)
            </button>
            <button
              type="button"
              onClick={() => {
                log("info", "Disparando chamada URGENTE (modal pausa vídeo)");
                onSimularDestaque();
              }}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/15 px-2 py-2 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/25"
            >
              <Zap className="h-3.5 w-3.5" />
              Urgente (modal)
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              log("info", "Limpando chamada simulada");
              onLimpar();
            }}
            className="w-full rounded-lg border border-white/10 px-2 py-1.5 text-[11px] font-medium text-white/70 hover:bg-white/10"
          >
            Limpar chamada simulada
          </button>

          {/* Logs */}
          <div className="rounded-lg border border-white/10 bg-black/40">
            <div className="border-b border-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white/50">
              Diagnóstico
            </div>
            <ul className="max-h-48 overflow-y-auto px-2 py-1.5 text-[11px] font-mono leading-relaxed">
              {logs.length === 0 && (
                <li className="text-white/40">Nenhum evento ainda…</li>
              )}
              {logs.map((e, i) => (
                <li
                  key={i}
                  className={
                    e.kind === "ok"
                      ? "text-emerald-300"
                      : e.kind === "warn"
                        ? "text-amber-300"
                        : e.kind === "err"
                          ? "text-rose-300"
                          : "text-white/70"
                  }
                >
                  <span className="text-white/40">
                    {e.at.toLocaleTimeString("pt-BR", { hour12: false })}
                  </span>{" "}
                  {e.msg}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[10px] leading-relaxed text-white/50">
            Acesse com <code className="rounded bg-white/10 px-1">?test=1</code>.
            O modal urgente faz o YouTube pausar via IFrame API; ao fechar,
            o player retoma sozinho.
          </p>
        </div>
      )}
    </div>
  );
}
