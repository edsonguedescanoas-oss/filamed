import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Star } from "lucide-react";
import type { ContrasteChamadas, TvVisualConfig } from "@/hooks/use-tv-visual-config";

type Prioridade = "normal" | "preferencial" | "urgente";

/* ── Paleta resolvida por nível de contraste ────────────────
 * Em "normal" devolve as cores configuradas; em "alto"/"maximo" força
 * combinações de altíssima diferenciação para legibilidade em ambientes
 * com luz forte (recepções com janelas grandes, sol direto na tela, etc).
 */
function paletaContraste(
  contraste: ContrasteChamadas,
  visual: { cor_primaria: string; cor_fundo: string; cor_texto: string },
): {
  fundo: string;
  texto: string;
  primaria: string;
  borda: string;
  fundoLinhaAtual: (accent: string) => string;
  fundoLinha: () => string;
} {
  if (contraste === "maximo") {
    // Preto puro + branco + amarelo (padrão usado em sinalização industrial e
    // acessibilidade para baixa visão).
    return {
      fundo: "#000000",
      texto: "#FFFFFF",
      primaria: "#FFD400",
      borda: "#FFD400",
      fundoLinhaAtual: () => "#1A1A00",
      fundoLinha: () => "#0A0A0A",
    };
  }
  if (contraste === "alto") {
    // Slate-950 + branco; mantém a primária do tema mas com contraste reforçado.
    return {
      fundo: "#020617",
      texto: "#FFFFFF",
      primaria: visual.cor_primaria,
      borda: visual.cor_primaria,
      fundoLinhaAtual: (accent) =>
        `color-mix(in srgb, ${accent} 35%, #020617)`,
      fundoLinha: () => "#0F172A",
    };
  }
  // normal: usa o tema configurado
  return {
    fundo: visual.cor_fundo,
    texto: visual.cor_texto,
    primaria: visual.cor_primaria,
    borda: visual.cor_primaria,
    fundoLinhaAtual: (accent) =>
      `color-mix(in srgb, ${accent} 18%, ${visual.cor_fundo})`,
    fundoLinha: () => `color-mix(in srgb, white 4%, ${visual.cor_fundo})`,
  };
}

/* ── Fallback quando não há mídia configurada ──────────────── */
export function NoMediaFallback({
  visual,
  unidadeNome,
}: {
  visual: TvVisualConfig;
  unidadeNome: string;
}) {
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
  /** Nível de contraste (default "normal"). */
  contraste?: ContrasteChamadas;
  /** Multiplicador de fonte (default 1). Aplica-se a TODOS os textos da linha. */
  escala?: number;
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
  contraste = "normal",
  escala = 1,
}: CallRowProps) {
  const horaFmt = new Date(hora).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const pal = paletaContraste(contraste, {
    cor_primaria: tvPrimaria,
    cor_fundo: tvFundo,
    cor_texto: tvTexto,
  });

  const accentColor =
    prioridade === "urgente"
      ? "#EF4444"
      : prioridade === "preferencial"
        ? "#F59E0B"
        : pal.primaria;

  // Tamanhos base (em rem) que serão multiplicados pela escala
  const sz = (baseRem: number) => `${baseRem * escala}rem`;
  // Padding da linha cresce junto pra não comprimir o texto grande
  const paddingY = `${0.75 * Math.max(escala, 1)}rem`;

  return (
    <div
      className={`grid grid-cols-[1fr_auto_1fr_auto] items-center gap-3 rounded-lg border-l-4 px-4 transition-all ${
        isAtual ? "shadow-glow" : ""
      } ${flash ? "animate-pulse-soft" : ""}`}
      style={{
        borderLeftColor: accentColor,
        borderLeftWidth: contraste === "maximo" ? "8px" : undefined,
        backgroundColor: isAtual ? pal.fundoLinhaAtual(accentColor) : pal.fundoLinha(),
        color: pal.texto,
        paddingTop: paddingY,
        paddingBottom: paddingY,
      }}
    >
      {/* Paciente */}
      <div className="min-w-0">
        <div
          className="truncate font-display font-bold"
          style={{ fontSize: isAtual ? sz(1.5) : sz(1) }}
          title={paciente ?? ""}
        >
          {paciente ?? <span className="opacity-40">—</span>}
        </div>
        {isAtual && (
          <div
            className="mt-0.5 inline-flex items-center gap-1 font-bold uppercase tracking-[0.2em]"
            style={{ color: accentColor, fontSize: sz(0.5625) }}
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
        className="font-display font-black tabular-nums leading-none"
        style={{
          color: isAtual ? accentColor : filaCor,
          fontSize: isAtual ? sz(3) : sz(1.5),
        }}
      >
        {codigo}
      </div>

      {/* Destino */}
      <div className="min-w-0">
        <div
          className="truncate font-bold"
          style={{
            color: isAtual ? accentColor : pal.texto,
            fontSize: isAtual ? sz(1.25) : sz(0.875),
          }}
          title={destino}
        >
          {destino}
        </div>
      </div>

      {/* Hora */}
      <div
        className="text-right font-mono tabular-nums"
        style={{
          fontSize: isAtual ? sz(1) : sz(0.75),
          fontWeight: isAtual ? 700 : 400,
          opacity: isAtual ? 1 : 0.6,
        }}
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

  // Honra contraste e escala configurados pra que o modal fique legível
  // mesmo em TV instalada longe ou em ambiente muito iluminado.
  const pal = paletaContraste(visual.contraste_chamadas, visual);
  const escala = visual.escala_chamadas ?? 1;
  const sz = (rem: number) => `${rem * escala}rem`;

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
          backgroundColor: pal.fundo,
          color: pal.texto,
        }}
      >
        <div
          className="inline-flex items-center gap-2 rounded-full px-5 py-2 font-black uppercase tracking-[0.4em]"
          style={{ backgroundColor: accent, color: "white", fontSize: sz(0.875) }}
        >
          <Icon className="h-5 w-5" />
          {label}
        </div>

        {paciente && (
          <p
            className="mt-8 font-display font-black leading-tight"
            style={{ color: pal.texto, fontSize: sz(3) }}
          >
            {paciente}
          </p>
        )}

        <div
          className="mt-6 font-display font-black leading-none tabular-nums"
          style={{ fontSize: sz(10), color: accent }}
        >
          {codigo}
        </div>

        <div className="mt-6">
          <div
            className="font-bold uppercase tracking-[0.3em] opacity-70"
            style={{ color: pal.primaria, fontSize: sz(0.875) }}
          >
            Dirija-se a
          </div>
          <div
            className="mt-2 font-display font-black"
            style={{ color: pal.texto, fontSize: sz(3.75) }}
          >
            {destino}
          </div>
        </div>
      </div>
    </div>
  );
}
