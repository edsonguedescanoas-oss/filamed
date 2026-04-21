import { useCallback, useEffect, useState } from "react";

/**
 * Zoom local do dispositivo — persiste em localStorage por chave (ex.: slug
 * da unidade). Não afeta outras TVs/dispositivos. Útil pra calibrar tamanho
 * em cada monitor/Firestick individualmente, sem mexer na config global.
 */
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.5;
const STEP = 0.05;

const clamp = (v: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v));

export function useLocalZoom(key: string | null | undefined) {
  const storageKey = key ? `tv:zoom:${key}` : null;
  const [zoom, setZoomState] = useState<number>(1);

  // Hidrata do localStorage no mount (e quando a chave muda)
  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? Number(raw) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) {
      setZoomState(clamp(parsed));
    } else {
      setZoomState(1);
    }
  }, [storageKey]);

  const setZoom = useCallback(
    (v: number) => {
      const next = clamp(v);
      setZoomState(next);
      if (storageKey && typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, String(next));
      }
    },
    [storageKey],
  );

  const inc = useCallback(() => setZoom(zoom + STEP), [zoom, setZoom]);
  const dec = useCallback(() => setZoom(zoom - STEP), [zoom, setZoom]);
  const reset = useCallback(() => setZoom(1), [setZoom]);

  return { zoom, setZoom, inc, dec, reset, MIN_ZOOM, MAX_ZOOM, STEP };
}
