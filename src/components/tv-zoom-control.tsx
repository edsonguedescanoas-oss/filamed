import { useEffect, useState } from "react";
import { Minus, Plus, RotateCcw, ZoomIn, Monitor } from "lucide-react";

interface Props {
  zoom: number;
  onInc: () => void;
  onDec: () => void;
  onReset: () => void;
  aspectRatio?: "16:9" | "4:3";
  onAspectRatioChange?: (ratio: "16:9" | "4:3") => void;
  /** Quando true (modo kiosk), o controle se esconde após inatividade. */
  autoHide?: boolean;
}

/**
 * Controle de zoom local sobreposto à TV. Fica no canto inferior direito.
 * - No modo normal: sempre visível.
 * - No modo kiosk: aparece só com movimento do mouse / toque, esconde
 *   após 4s de inatividade.
 * - Atalhos de teclado: + / - para zoom, 0 para resetar.
 */
export function TvZoomControl({ zoom, onInc, onDec, onReset, aspectRatio, onAspectRatioChange, autoHide }: Props) {
  const [visible, setVisible] = useState(!autoHide);

  useEffect(() => {
    if (!autoHide || typeof window === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const show = () => {
      setVisible(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setVisible(false), 4000);
    };
    window.addEventListener("mousemove", show);
    window.addEventListener("touchstart", show);
    window.addEventListener("keydown", show);
    show();
    return () => {
      window.removeEventListener("mousemove", show);
      window.removeEventListener("touchstart", show);
      window.removeEventListener("keydown", show);
      if (timer) clearTimeout(timer);
    };
  }, [autoHide]);

  // Atalhos de teclado
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      // Ignora se o foco está em input
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        onInc();
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        onDec();
      } else if (e.key === "0") {
        e.preventDefault();
        onReset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onInc, onDec, onReset]);

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-white/15 bg-black/70 p-1 pl-2 text-white shadow-2xl backdrop-blur transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex items-center gap-1 border-r border-white/10 pr-2 mr-1">
        <ZoomIn className="h-3.5 w-3.5 text-white/50" />
        <button
          type="button"
          onClick={onDec}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/15 transition-colors"
          aria-label="Diminuir zoom"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-[3.25rem] text-center font-mono text-xs font-bold tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={onInc}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/15 transition-colors"
          aria-label="Aumentar zoom"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onReset}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/15 transition-colors"
          aria-label="Resetar zoom"
          title="Resetar para 100%"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {onAspectRatioChange && (
        <div className="flex items-center gap-1 pr-1">
          <Monitor className="h-3.5 w-3.5 text-white/50" />
          <button
            type="button"
            onClick={() => onAspectRatioChange("16:9")}
            className={`flex h-8 px-2 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
              aspectRatio === "16:9" ? "bg-primary text-white" : "hover:bg-white/15 text-white/70"
            }`}
          >
            16:9
          </button>
          <button
            type="button"
            onClick={() => onAspectRatioChange("4:3")}
            className={`flex h-8 px-2 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
              aspectRatio === "4:3" ? "bg-primary text-white" : "hover:bg-white/15 text-white/70"
            }`}
          >
            4:3
          </button>
        </div>
      )}
    </div>
  );
}
