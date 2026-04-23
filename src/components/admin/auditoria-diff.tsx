import { ArrowRight, Minus, Plus, Equal } from "lucide-react";
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

  return (
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
  );
}
