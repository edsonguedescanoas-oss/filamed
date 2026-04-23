import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";

export function OrientationGuard() {
  const [isPortrait, setIsPortrait] = useState(false);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Detecta se é retrato
      const portrait = window.innerHeight > window.innerWidth;
      
      // Detecta mobile/tablet baseado em viewport e DPI (evita notebooks com touch)
      // Dispositivos mobile/tablet geralmente têm touch, DPI alto e largura de tela limitada
      const hasTouch = navigator.maxTouchPoints > 0;
      const isHighDPI = window.devicePixelRatio >= 2;
      const isMobileWidth = Math.max(window.screen.width, window.screen.height) <= 1366;
      
      // Consideramos mobile/tablet se tiver touch E (DPI alto OU largura pequena)
      const mobileOrTablet = hasTouch && (isHighDPI || window.innerWidth < 768) && isMobileWidth;
      
      setIsPortrait(portrait);
      setIsMobileOrTablet(mobileOrTablet);
    };

    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);
    
    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  // Se não for mobile/tablet ou já estiver na horizontal, não faz nada
  if (!isMobileOrTablet || !isPortrait) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background p-8 text-center text-foreground">
      <div className="mb-8 animate-pulse">
        <div className="relative">
          <Smartphone className="h-20 w-20 text-muted-foreground/30" />
          <Smartphone className="absolute inset-0 h-20 w-20 rotate-90 text-primary animate-[spin_3s_ease-in-out_infinite]" />
        </div>
      </div>
      
      <h2 className="font-display text-2xl font-bold mb-3 tracking-tight">
        Gire seu dispositivo
      </h2>
      
      <p className="text-muted-foreground text-base leading-relaxed max-w-[280px] mx-auto">
        Este sistema foi otimizado para visualização em modo <strong>paisagem</strong> (horizontal).
      </p>
      
      <div className="mt-10 flex gap-2 items-center text-[10px] text-muted-foreground/50 uppercase tracking-widest font-semibold">
        <div className="h-px w-8 bg-border" />
        Modo Horizontal Recomendado
        <div className="h-px w-8 bg-border" />
      </div>
    </div>
  );
}
