import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";

export function OrientationGuard() {
  const [isPortrait, setIsPortrait] = useState(false);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Detecta se é retrato
      const portrait = window.innerHeight > window.innerWidth;
      
      // Detecta mobile/tablet (incluindo iPads que se passam por desktop)
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      
      const tablet = (navigator.maxTouchPoints > 0 && Math.max(window.screen.width, window.screen.height) <= 1366);
      
      // Só ativamos o bloqueio se for mobile/tablet em modo retrato
      setIsPortrait(portrait);
      setIsMobileOrTablet(mobile || tablet);
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
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900 p-8 text-center text-white">
      <div className="mb-8 animate-pulse">
        <div className="relative">
          <Smartphone className="h-20 w-20 text-slate-500" />
          <Smartphone className="absolute inset-0 h-20 w-20 rotate-90 text-primary animate-[spin_3s_ease-in-out_infinite]" />
        </div>
      </div>
      
      <h2 className="font-display text-2xl font-bold mb-3 tracking-tight">
        Gire seu dispositivo
      </h2>
      
      <p className="text-slate-400 text-base leading-relaxed max-w-[280px] mx-auto">
        Este sistema foi otimizado para visualização em modo <strong>paisagem</strong> (horizontal).
      </p>
      
      <div className="mt-10 flex gap-2 items-center text-xs text-slate-500 uppercase tracking-widest font-semibold">
        <div className="h-px w-8 bg-slate-800" />
        Modo Horizontal Recomendado
        <div className="h-px w-8 bg-slate-800" />
      </div>
    </div>
  );
}
