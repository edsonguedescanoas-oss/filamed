import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Star } from "lucide-react";
import type { TvVisualConfig } from "@/hooks/use-tv-visual-config";

type Prioridade = "normal" | "preferencial" | "urgente";

/* ── Fallback quando não há mídia configurada ──────────────── */
export function NoMediaFallback({
  visual,
  unidadeNome,
}: {
  visual: TvVisualConfig;
  unidadeNome: string;
}) {
  // Só renderiza se o carrossel não tiver itens (heurística: ele monta o
  // próprio container; se estiver vazio, retorna null e nosso wrapper fica
  // sem altura). Para garantir o estado vazio, fazemos um placeholder
  // absoluto que vive atrás do carrossel.
  return (
    <div
      className="pointer-events-none absolute inset-0 -z-10 flex flex-col items-center justify-center gap-4 rounded-3xl border border-white/10"
      style={{
        backgroundColor: `color-mix(in srgb, ${visual.cor_primaria} 8%, ${visual.cor_fundo})`,
      }}
    >
      {visual.logo_url ? (
        <img
          src={visual.logo_url}
          alt={unidadeNome}
          className="max-h-[40%] max-w-[60%] object-contain opacity-90"
        />
      ) : (
        <div
          className="flex h-32 w-32 items-center justify-center rounded-3xl shadow-glow"
          style={{ backgroundColor: visual.cor_primaria }}
        >
          <Activity className="h-16 w-16 text-white" strokeWidth={2.5} />
        </div>
      )}
      <p
        className="font-display text-3xl font-bold opacity-90"
        style={{ color: visual.cor_texto }}
      >
        {unidadeNome}
      </p>
    </div>
  );
}

/* ── Linha da tabela de senhas ─────────────────────────────── */
interface CallRowProps {
  codigo: string;
  destino: string;
  paciente: string | null;
  hora: string;
  prioridade: Prioridade;
  filaCor: string;
  filaNome: string;
  isAtual?: boolean;
  flash?: boolean;
  tvPrimaria: string;
  tvFundo: string;
  tvTexto: string;
}

export function CallRow({
  codigo,
  destino,
  paciente,
  hora,
  prioridade,
  filaCor,
  isAtual,
  flash,
  tvPrimaria,
  tvFundo,
  tvTexto,
}: CallRowProps) {
  const horaFmt = new Date(hora).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const accentColor =
    prioridade === "urgente"
      ? "#EF4444"
      : prioridade === "preferencial"
        ? "#F59E0B"
        : tvPrimaria;

  return (
    <div
      className={`grid grid-cols-[1fr_auto_1fr_auto] items-center gap-3 rounded-lg border-l-4 px-4 py-3 transition-all ${
        isAtual ? "shadow-glow" : ""
      } ${flash ? "animate-pulse-soft" : ""}`}
      style={{
        borderLeftColor: accentColor,
        backgroundColor: isAtual
          ? `color-mix(in srgb, ${accentColor} 18%, ${tvFundo})`
          : `color-mix(in srgb, white 4%, ${tvFundo})`,
        color: tvTexto,
      }}
    >
      {/* Paciente */}
      <div className="min-w-0">
        <div
          className={`truncate font-display font-bold ${isAtual ? "text-2xl" : "text-base"}`}
          title={paciente ?? ""}
        >
          {paciente ?? <span className="opacity-40">—</span>}
        </div>
        {isAtual && (
          <div
            className="mt-0.5 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.2em]"
            style={{ color: accentColor }}
          >
            <span
              className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ backgroundColor: accentColor }}
            />
            Senha atual
          </div>
        )}
      </div>

      {/* Senha */}
      <div
        className={`font-display font-black tabular-nums leading-none ${
          isAtual ? "text-5xl" : "text-2xl"
        }`}
        style={{ color: isAtual ? accentColor : filaCor }}
      >
        {codigo}
      </div>

      {/* Destino */}
      <div className="min-w-0">
        <div
          className={`truncate font-bold ${isAtual ? "text-xl" : "text-sm"}`}
          style={{ color: isAtual ? accentColor : tvTexto }}
          title={destino}
        >
          {destino}
        </div>
      </div>

      {/* Hora */}
      <div
        className={`text-right font-mono tabular-nums ${
          isAtual ? "text-base font-bold" : "text-xs opacity-60"
        }`}
      >
        {horaFmt}
      </div>
    </div>
  );
}

/* ── Modal de chamada destacada (urgente/preferencial) ─────── */
interface CallModalProps {
  codigo: string;
  destino: string;
  paciente: string | null;
  prioridade: Prioridade;
  visual: TvVisualConfig;
}

export function CallModal({
  codigo,
  destino,
  paciente,
  prioridade,
  visual,
}: CallModalProps) {
  const [visible, setVisible] = useState(true);

  // Auto-fecha após 8s — pra não cobrir o painel indefinidamente
  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 8000);
    return () => clearTimeout(t);
  }, [codigo, destino]);

  if (!visible) return null;

  const isUrgente = prioridade === "urgente";
  const accent = isUrgente ? "#EF4444" : "#F59E0B";
  const Icon = isUrgente ? AlertTriangle : Star;
  const label = isUrgente ? "URGENTE" : "PREFERENCIAL";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md animate-fade-in"
      style={{
        backgroundColor: `color-mix(in srgb, ${accent} 25%, rgba(0,0,0,0.85))`,
      }}
      role="alert"
      aria-live="assertive"
    >
      {/* Borda piscante */}
      <div
        className="absolute inset-4 rounded-3xl border-4 animate-pulse"
        style={{ borderColor: accent }}
      />

      <div
        className="relative mx-8 w-full max-w-5xl rounded-3xl border-4 p-12 text-center shadow-2xl animate-scale-in"
        style={{
          borderColor: accent,
          backgroundColor: visual.cor_fundo,
          color: visual.cor_texto,
        }}
      >
        <div
          className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-black uppercase tracking-[0.4em]"
          style={{ backgroundColor: accent, color: "white" }}
        >
          <Icon className="h-5 w-5" />
          {label}
        </div>

        {paciente && (
          <p
            className="mt-8 font-display text-5xl font-black leading-tight"
            style={{ color: visual.cor_texto }}
          >
            {paciente}
          </p>
        )}

        <div
          className="mt-6 font-display font-black leading-none tabular-nums"
          style={{ fontSize: "10rem", color: accent }}
        >
          {codigo}
        </div>

        <div className="mt-6">
          <div
            className="text-sm font-bold uppercase tracking-[0.3em] opacity-70"
            style={{ color: visual.cor_primaria }}
          >
            Dirija-se a
          </div>
          <div
            className="mt-2 font-display text-6xl font-black"
            style={{ color: visual.cor_texto }}
          >
            {destino}
          </div>
        </div>
      </div>
    </div>
  );
}
