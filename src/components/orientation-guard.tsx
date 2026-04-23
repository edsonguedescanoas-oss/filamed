import { useEffect, useState } from "react";
import { Smartphone, ChevronRight } from "lucide-react";

export function OrientationGuard() {
  const [isPortrait, setIsPortrait] = useState(false);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const [hasSkipped, setHasSkipped] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("orientation-guard-skipped") === "true";
    }
    return false;
  });

  useEffect(() => {
    const checkOrientation = () => {
      // Detecta se é retrato
      const portrait = window.innerHeight > window.innerWidth;
      
      // Detecta mobile/tablet baseado em viewport e DPI
      const hasTouch = navigator.maxTouchPoints > 0;
      const isHighDPI = window.devicePixelRatio >= 2;
      const isMobileWidth = Math.max(window.screen.width, window.screen.height) <= 1366;
      
      const mobileOrTablet = hasTouch && (isHighDPI || window.innerWidth < 768) && isMobileWidth;
      
      setIsPortrait(portrait);
      setIsMobileOrTablet(mobileOrTablet);

      // Se o usuário girou para paisagem, marcamos como "pulado/orientado" para não mostrar mais o bloqueio
      if (!portrait && mobileOrTablet) {
        setHasSkipped(true);
        localStorage.setItem("orientation-guard-skipped", "true");
      }

      // Tenta orientar automaticamente para landscape se estiver em mobile/tablet e portrait
      if (portrait && mobileOrTablet && screen.orientation && screen.orientation.lock) {
        try {
          // @ts-ignore
          screen.orientation.lock("landscape").catch(() => {
            console.log("Auto-orientation lock failed (needs user interaction)");
          });
        } catch (e) {
          // Ignore
        }
      }
    };

    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);
    
    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  const handleManualOrientation = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      if (screen.orientation && screen.orientation.lock) {
        // @ts-ignore
        await screen.orientation.lock("landscape");
      }
      // Marcar como skip/orientado após sucesso
      setHasSkipped(true);
      localStorage.setItem("orientation-guard-skipped", "true");
    } catch (error) {
      console.error("Failed to force landscape:", error);
    }
  };

  const handleSkip = () => {
    setHasSkipped(true);
    localStorage.setItem("orientation-guard-skipped", "true");
  };

  // Se não for mobile/tablet ou já estiver na horizontal ou tiver ignorado, não faz nada
  if (!isMobileOrTablet || !isPortrait || hasSkipped) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm p-8 text-center text-foreground">
      <div className="mb-8 relative">
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150" />
        <div className="relative animate-pulse">
          <Smartphone className="h-24 w-24 text-muted-foreground/30" />
          <Smartphone className="absolute inset-0 h-24 w-24 rotate-90 text-primary animate-[spin_4s_ease-in-out_infinite]" />
        </div>
      </div>
      
      <h2 className="font-display text-3xl font-bold mb-4 tracking-tight">
        Modo Paisagem Recomendado
      </h2>
      
      <p className="text-muted-foreground text-lg leading-relaxed max-w-[320px] mx-auto mb-10">
        Para uma melhor experiência de gestão, recomendamos girar seu dispositivo para a <strong>horizontal</strong>.
      </p>

      <div className="flex flex-col gap-4 w-full max-w-[280px]">
        <button
          onClick={handleManualOrientation}
          className="w-full px-6 py-4 bg-primary text-primary-foreground rounded-2xl font-semibold shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2 group"
        >
          <Smartphone className="h-5 w-5 rotate-90 group-hover:rotate-0 transition-transform duration-500" />
          Otimizar Visualização
        </button>

        <button
          onClick={handleSkip}
          className="w-full px-6 py-3 bg-secondary/50 text-secondary-foreground rounded-xl font-medium hover:bg-secondary/80 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
        >
          Continuar em modo retrato
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      
      <div className="mt-16 flex gap-3 items-center text-[11px] text-muted-foreground/30 uppercase tracking-[0.2em] font-bold">
        <div className="h-px w-8 bg-border/50" />
        Plataforma Profissional
        <div className="h-px w-8 bg-border/50" />
      </div>
    </div>
  );
}
