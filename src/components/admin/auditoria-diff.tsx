import { ArrowRight, Minus, Plus, Equal, Clock, Users, MoveRight } from "lucide-react";
import { cn } from "@/lib/utils";

type JsonRecord = Record<string, unknown>;

type DiffStatus = "added" | "removed" | "changed" | "unchanged";

interface DiffField {
  key: string;
  status: DiffStatus;
  before: unknown;
  after: unknown;
}

function isPlainObject(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (typeof a !== "object") return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

function buildDiff(before: JsonRecord | null, after: JsonRecord | null): DiffField[] {
  const keys = new Set<string>();
  if (before) Object.keys(before).forEach((k) => keys.add(k));
  if (after) Object.keys(after).forEach((k) => keys.add(k));

  const fields: DiffField[] = [];
  for (const key of keys) {
    const hasBefore = !!before && key in before;
    const hasAfter = !!after && key in after;
    const b = hasBefore ? before![key] : undefined;
    const a = hasAfter ? after![key] : undefined;

    let status: DiffStatus;
    if (!hasBefore && hasAfter) status = "added";
    else if (hasBefore && !hasAfter) status = "removed";
    else if (deepEqual(b, a)) status = "unchanged";
    else status = "changed";

    fields.push({ key, status, before: b, after: a });
  }

  // Ordena: changed/added/removed primeiro, unchanged por último
  const order: Record<DiffStatus, number> = { changed: 0, added: 1, removed: 2, unchanged: 3 };
  fields.sort((x, y) => order[x.status] - order[y.status] || x.key.localeCompare(y.key));
  return fields;
}

const STATUS_META: Record<
  DiffStatus,
  { icon: typeof Plus; label: string; tone: string; rowTone: string }
> = {
  added: {
    icon: Plus,
    label: "Adicionado",
    tone: "text-emerald-600 dark:text-emerald-400",
    rowTone: "bg-emerald-500/5 border-l-2 border-l-emerald-500/60",
  },
  removed: {
    icon: Minus,
    label: "Removido",
    tone: "text-destructive",
    rowTone: "bg-destructive/5 border-l-2 border-l-destructive/60",
  },
  changed: {
    icon: ArrowRight,
    label: "Alterado",
    tone: "text-amber-600 dark:text-amber-400",
    rowTone: "bg-amber-500/5 border-l-2 border-l-amber-500/60",
  },
  unchanged: {
    icon: Equal,
    label: "Inalterado",
    tone: "text-muted-foreground",
    rowTone: "bg-muted/20 border-l-2 border-l-border",
  },
};

function ValueCell({
  value,
  empty,
  highlight,
}: {
  value: unknown;
  empty: boolean;
  highlight?: "added" | "removed" | "changed-before" | "changed-after" | null;
}) {
  const text = empty ? "—" : stringifyValue(value);
  const isObject = !empty && (isPlainObject(value) || Array.isArray(value));
  return (
    <div
      className={cn(
        "min-h-[1.5rem] rounded px-2 py-1 font-mono text-[11px] leading-snug",
        empty && "italic text-muted-foreground/60",
        highlight === "added" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        highlight === "removed" &&
          "bg-destructive/10 text-destructive line-through decoration-destructive/40",
        highlight === "changed-before" &&
          "bg-destructive/10 text-destructive/80 line-through decoration-destructive/30",
        highlight === "changed-after" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      )}
    >
      {isObject ? (
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words">{text}</pre>
      ) : (
        <span className="break-words">{text}</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card visual "Antes vs Depois" especifico para mudancas de fila.
// Renderizado quando ambos os payloads carregam tipo === "movimentacao_fila".
// Mostra fila/posicao/tempo em formato grande e legivel, sobre o diff bruto.
// ---------------------------------------------------------------------------

type MovimentacaoFila = {
  fila_nome?: string | null;
  posicao?: number | null;
  tempo_espera_estimado?: number | null;
  codigo?: string | null;
};

function isMovimentacaoFila(o: JsonRecord | null): o is JsonRecord {
  return !!o && o["tipo"] === "movimentacao_fila";
}

function fmtPosicao(p: unknown): string {
  if (typeof p !== "number" || !Number.isFinite(p)) return "—";
  return `${p}º`;
}

function fmtMin(t: unknown): string {
  if (typeof t !== "number" || !Number.isFinite(t)) return "—";
  if (t <= 0) return "agora";
  if (t < 60) return `~${t} min`;
  const h = Math.floor(t / 60);
  const m = t % 60;
  return m === 0 ? `~${h}h` : `~${h}h${m}min`;
}

function deltaTempo(antes: unknown, depois: unknown): { texto: string; tone: string } | null {
  if (typeof antes !== "number" || typeof depois !== "number") return null;
  const diff = depois - antes;
  if (diff === 0) return { texto: "sem mudanca de tempo", tone: "text-muted-foreground" };
  if (diff > 0)
    return {
      texto: `+${diff} min de espera`,
      tone: "text-amber-600 dark:text-amber-400",
    };
  return {
    texto: `${diff} min de espera`,
    tone: "text-emerald-600 dark:text-emerald-400",
  };
}

function MovimentacaoFilaCard({
  before,
  after,
}: {
  before: MovimentacaoFila;
  after: MovimentacaoFila;
}) {
  const delta = deltaTempo(before.tempo_espera_estimado, after.tempo_espera_estimado);
  const codigo = before.codigo ?? after.codigo ?? null;
  return (
    <div className="rounded-lg border border-amber-300/60 bg-gradient-to-br from-amber-50 to-orange-50/60 p-4 dark:border-amber-500/30 dark:from-amber-500/10 dark:to-orange-500/5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300">
            <MoveRight className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Mudanca de fila {codigo ? `· ${codigo}` : ""}
            </p>
            <p className="text-[10px] text-amber-700/70 dark:text-amber-300/70">
              Comparativo de posicao e tempo estimado
            </p>
          </div>
        </div>
        {delta && (
          <span
            className={cn(
              "rounded-full bg-white/60 px-2 py-0.5 text-[11px] font-semibold tabular-nums dark:bg-black/30",
              delta.tone,
            )}
          >
            {delta.texto}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 items-stretch gap-2 sm:grid-cols-[1fr_auto_1fr]">
        {/* ANTES */}
        <div className="rounded-md border border-border/60 bg-card/80 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Antes
          </p>
          <p className="mb-2 truncate text-sm font-semibold text-foreground" title={before.fila_nome ?? undefined}>
            {before.fila_nome ?? "Fila desconhecida"}
          </p>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Posicao:</span>
              <span className="font-mono font-semibold tabular-nums text-foreground">
                {fmtPosicao(before.posicao)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Espera:</span>
              <span className="font-mono font-semibold tabular-nums text-foreground">
                {fmtMin(before.tempo_espera_estimado)}
              </span>
            </div>
          </div>
        </div>

        {/* SETA */}
        <div className="hidden items-center justify-center sm:flex">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
        <div className="flex items-center justify-center sm:hidden">
          <ArrowRight className="h-4 w-4 rotate-90 text-amber-600 dark:text-amber-400" />
        </div>

        {/* DEPOIS */}
        <div className="rounded-md border border-amber-400/50 bg-amber-100/50 p-3 dark:border-amber-500/40 dark:bg-amber-500/15">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
            Depois
          </p>
          <p
            className="mb-2 truncate text-sm font-semibold text-foreground"
            title={after.fila_nome ?? undefined}
          >
            {after.fila_nome ?? "Fila desconhecida"}
          </p>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5">
              <Users className="h-3 w-3 text-amber-700 dark:text-amber-300" />
              <span className="text-muted-foreground">Posicao:</span>
              <span className="font-mono font-semibold tabular-nums text-foreground">
                {fmtPosicao(after.posicao)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-amber-700 dark:text-amber-300" />
              <span className="text-muted-foreground">Espera:</span>
              <span className="font-mono font-semibold tabular-nums text-foreground">
                {fmtMin(after.tempo_espera_estimado)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-amber-800/80 dark:text-amber-200/70">
        A senha foi recolocada no FINAL da nova fila e o tempo de espera passou
        a ser contado a partir da movimentacao.
      </p>
    </div>
  );
}

export function AuditoriaDiff({
  before,
  after,
}: {
  before: JsonRecord | null;
  after: JsonRecord | null;
}) {
  // Caso só exista um lado (criação ou exclusão sem snapshot anterior),
  // mostra apenas o payload disponível como bloco simples.
  if (!before && !after) return null;

  if (!before || !after) {
    const data = before ?? after!;
    const isCreation = !before;
    return (
      <div className="rounded-md border border-border bg-muted/40 p-3">
        <p
          className={cn(
            "mb-1.5 text-[10px] font-semibold uppercase tracking-wider",
            isCreation ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
          )}
        >
          {isCreation ? "Estado criado" : "Estado removido"}
        </p>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-snug text-foreground/80">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  }

  const fields = buildDiff(before, after);
  const changedCount = fields.filter((f) => f.status !== "unchanged").length;

  // Detecta movimentacao de fila (marcador emitido pelo dialog de edicao).
  // Quando presente, mostra um card "Antes vs Depois" amigavel acima do diff.
  const showMovimentacaoFila = isMovimentacaoFila(before) && isMovimentacaoFila(after);

  return (
    <div className="space-y-3">
      {showMovimentacaoFila && (
        <MovimentacaoFilaCard
          before={before as MovimentacaoFila}
          after={after as MovimentacaoFila}
        />
      )}
      <div className="rounded-md border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Diff de payload
        </p>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            {fields.filter((f) => f.status === "changed").length} alterados
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {fields.filter((f) => f.status === "added").length} adicionados
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
            {fields.filter((f) => f.status === "removed").length} removidos
          </span>
        </div>
      </div>

      {/* Column titles */}
      <div className="grid grid-cols-[140px_1fr_1fr] gap-px bg-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <div className="bg-muted/30 px-3 py-1.5">Campo</div>
        <div className="bg-muted/30 px-3 py-1.5">Antes</div>
        <div className="bg-muted/30 px-3 py-1.5">Depois</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {fields.map((f) => {
          const meta = STATUS_META[f.status];
          const Icon = meta.icon;
          return (
            <div
              key={f.key}
              className={cn(
                "grid grid-cols-[140px_1fr_1fr] gap-2 px-2 py-1.5 text-xs",
                meta.rowTone,
              )}
            >
              <div className="flex items-start gap-1.5 px-1 py-1">
                <Icon className={cn("mt-0.5 h-3 w-3 shrink-0", meta.tone)} />
                <span className="break-all font-mono text-[11px] font-medium text-foreground/90">
                  {f.key}
                </span>
              </div>
              <ValueCell
                value={f.before}
                empty={f.status === "added"}
                highlight={
                  f.status === "removed"
                    ? "removed"
                    : f.status === "changed"
                      ? "changed-before"
                      : null
                }
              />
              <ValueCell
                value={f.after}
                empty={f.status === "removed"}
                highlight={
                  f.status === "added"
                    ? "added"
                    : f.status === "changed"
                      ? "changed-after"
                      : null
                }
              />
            </div>
          );
        })}
      </div>

      {changedCount === 0 && (
        <div className="border-t border-border bg-muted/30 px-3 py-2 text-center text-[11px] text-muted-foreground">
          Nenhuma diferença entre os snapshots.
        </div>
      )}
      </div>
    </div>
  );
}
