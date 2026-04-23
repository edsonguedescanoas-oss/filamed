import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";

export function OrientationGuard() {
  const [isPortrait, setIsPortrait] = useState(false);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

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

      // Tenta orientar automaticamente para landscape se estiver em mobile/tablet e portrait
      if (portrait && mobileOrTablet && screen.orientation && screen.orientation.lock) {
        // Tenta dar lock silencioso (pode falhar por falta de user interaction, mas tentamos)
        try {
          // @ts-ignore - lock is still experimental in some browsers
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
    } catch (error) {
      console.error("Failed to force landscape:", error);
    }
  };

  // Se não for mobile/tablet ou já estiver na horizontal, não faz nada
  if (!isMobileOrTablet || !isPortrait) return null;

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
        Modo Paisagem Necessário
      </h2>
      
      <p className="text-muted-foreground text-lg leading-relaxed max-w-[320px] mx-auto mb-10">
        Para uma melhor experiência de gestão, por favor gire seu dispositivo para a <strong>horizontal</strong>.
      </p>

      <button
        onClick={handleManualOrientation}
        className="px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold shadow-lg hover:bg-primary/90 transition-all active:scale-95 flex items-center gap-2"
      >
        <Smartphone className="h-5 w-5 rotate-90" />
        Tentar Orientar Agora
      </button>
      
      <div className="mt-12 flex gap-3 items-center text-[11px] text-muted-foreground/40 uppercase tracking-[0.2em] font-bold">
        <div className="h-px w-10 bg-border" />
        Visualização Otimizada
        <div className="h-px w-10 bg-border" />
      </div>
    </div>
  );
}
