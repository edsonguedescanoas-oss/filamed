import { useEffect, useRef } from "react";

/**
 * Mantém a tela do dispositivo sempre acordada enquanto o painel está
 * aberto. Estratégia em camadas:
 *
 * 1. **Screen Wake Lock API** (Chromium 84+, Safari 16.4+, Firefox 126+):
 *    a forma oficial e mais leve. Requer HTTPS + página visível.
 *    Reativa automaticamente quando a aba volta a ficar visível
 *    (`visibilitychange`), porque o Wake Lock é liberado pelo navegador
 *    sempre que a aba fica oculta.
 *
 * 2. **Fallback de vídeo silencioso em loop** (Firestick / Smart TVs
 *    antigas / Firefox antigo / iOS sem PWA): mantém um <video> invisível
 *    tocando em loop. Plataformas de TV interpretam playback ativo como
 *    "uso" e não disparam o screensaver / sleep.
 *
 * O vídeo é um WebM minúsculo embutido em data URL (alguns KB) — sem
 * requisição de rede e sem áudio. Iniciar o playback exige um gesto do
 * usuário (autoplay policy). Anexamos um listener global de
 * clique/toque/tecla pra ligar na primeira interação. Em modo kiosk
 * (TV/Firestick), basta o controle remoto apertar qualquer tecla uma vez.
 */

// WebM 1×1 px, ~5s de loop, sem áudio. Base64 enxuto pra não inflar bundle.
// Gerado com: ffmpeg -f lavfi -i color=black:s=2x2:r=1 -t 5 -c:v libvpx -an out.webm
const TINY_WEBM =
  "data:video/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwH/////////FUmpZpkq17GDD0JATYCGQ2hyb21lV0GGQ2hyb21lFlSua8yuAQAAAAAAAFq14QEAAAAAAABKrgEAAAAAAABG14EBc8WBAZyBACK1nIN1bmSGhVZfVlA4g4EBI+ODhAT3kNXgAQAAAAAAABKwgQC6gQCygQC/g4EH84EBgAEAAAAAAACfQbqBA59TuoQGqTGCAACgnQEqAgACABAQEAEKxgF2AwBhrAB1Ig8GogIAlIA=";

type WakeLockSentinel = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: "release", listener: () => void) => void;
};

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinel>;
  };
};

export function useWakeLock(enabled: boolean = true) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || typeof document === "undefined") return;

    let cancelled = false;
    const nav = navigator as NavigatorWithWakeLock;
    const hasWakeLock = Boolean(nav.wakeLock?.request);

    /* ── Camada 1: Screen Wake Lock API ──────────────────── */
    const acquire = async () => {
      if (!hasWakeLock || cancelled) return;
      if (document.visibilityState !== "visible") return;
      try {
        const sentinel = await nav.wakeLock!.request("screen");
        if (cancelled) {
          void sentinel.release().catch(() => {});
          return;
        }
        sentinelRef.current = sentinel;
        sentinel.addEventListener("release", () => {
          // Wake Lock foi liberado (aba escondida, sistema, etc.).
          // Quando voltar a ficar visível, reativamos via visibilitychange.
          sentinelRef.current = null;
        });
      } catch {
        // Pode falhar por permissões / contexto não-seguro. Silencioso —
        // o fallback de vídeo continua ativo em paralelo.
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        if (!sentinelRef.current) void acquire();
        // Tenta reativar o vídeo também (alguns navegadores pausam ao ocultar)
        const v = videoRef.current;
        if (v && v.paused) v.play().catch(() => {});
      }
    };

    /* ── Camada 2: Vídeo silencioso em loop (fallback) ───── */
    const setupVideo = () => {
      if (videoRef.current) return videoRef.current;
      const v = document.createElement("video");
      v.src = TINY_WEBM;
      v.loop = true;
      v.muted = true;
      v.playsInline = true;
      v.setAttribute("playsinline", "");
      v.setAttribute("webkit-playsinline", "");
      v.setAttribute("aria-hidden", "true");
      v.setAttribute("tabindex", "-1");
      // 1×1 px, fora da tela, sem custo visual nem de input.
      v.style.cssText =
        "position:fixed;width:1px;height:1px;left:-1px;top:-1px;opacity:0;pointer-events:none;z-index:-1;";
      document.body.appendChild(v);
      videoRef.current = v;
      return v;
    };

    const tryPlayVideo = () => {
      const v = setupVideo();
      v.play().catch(() => {
        // Bloqueado por autoplay policy — vai ser destravado no primeiro gesto.
      });
    };

    const onFirstInteract = () => {
      tryPlayVideo();
      void acquire();
      window.removeEventListener("click", onFirstInteract);
      window.removeEventListener("touchstart", onFirstInteract);
      window.removeEventListener("keydown", onFirstInteract);
    };

    // Tenta de cara (alguns ambientes TV/kiosk permitem autoplay muted).
    void acquire();
    tryPlayVideo();

    // E garante destravar no primeiro gesto (controle remoto, toque, mouse).
    window.addEventListener("click", onFirstInteract);
    window.addEventListener("touchstart", onFirstInteract);
    window.addEventListener("keydown", onFirstInteract);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener("click", onFirstInteract);
      window.removeEventListener("touchstart", onFirstInteract);
      window.removeEventListener("keydown", onFirstInteract);
      document.removeEventListener("visibilitychange", onVisibility);
      if (sentinelRef.current) {
        void sentinelRef.current.release().catch(() => {});
        sentinelRef.current = null;
      }
      const v = videoRef.current;
      if (v) {
        try {
          v.pause();
          v.removeAttribute("src");
          v.load();
          v.remove();
        } catch {
          /* ignora */
        }
        videoRef.current = null;
      }
    };
  }, [enabled]);
}
