import { createFileRoute } from "@tanstack/react-router";
import { Monitor, Layout, AlertCircle, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/test/horizontal")({
  component: TestHorizontalPage,
});

const SIZES = [
  { w: 1024, h: 576, label: "Laptop / Desktop Pequeno (1024x576)" },
  { w: 1280, h: 720, label: "HD / Laptop Comum (1280x720)" },
  { w: 1440, h: 810, label: "Desktop Médio (1440x810)" },
  { w: 1920, h: 1080, label: "Full HD (1920x1080)" },
  { w: 2560, h: 1440, label: "Quad HD (2560x1440)" },
];

function TestHorizontalPage() {
  return (
    <div className="min-h-screen bg-slate-950 p-8 text-white font-sans">
      <header className="mb-12 border-b border-white/5 pb-8">
        <div className="flex items-center gap-3 text-primary mb-2">
          <Layout className="h-6 w-6" />
          <span className="text-xs font-black uppercase tracking-widest">Validation Suite</span>
        </div>
        <h1 className="font-display text-4xl font-black">Layout Horizontal</h1>
        <p className="mt-2 text-slate-400 max-w-2xl">
          Páginas de validação para garantir que o <b>Atendimento</b> e o <b>Painel TV</b> se adaptem perfeitamente a diferentes larguras de tela, evitando quebras em monitores ultrawide ou laptops menores.
        </p>
      </header>

      <section className="space-y-24 pb-20">
        {/* TV SECTION */}
        <div>
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-bold">
                <Monitor className="h-6 w-6 text-primary" />
                Painel TV
              </h2>
              <p className="text-sm text-slate-500">Validação da grade flexível (CSS Grid + Container Queries)</p>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-xs font-mono border border-white/10">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span>Dica: Use F11 no iframe para testar tela cheia local</span>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
            {SIZES.slice(0, 4).map((size) => (
              <div key={`tv-${size.w}`} className="group space-y-3">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-black uppercase tracking-tighter text-slate-500">{size.label}</span>
                  <div className="h-px flex-1 mx-4 bg-white/5" />
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold border",
                    size.w >= 1536 ? "bg-purple-500/10 border-purple-500/50 text-purple-400" :
                    size.w >= 1280 ? "bg-blue-500/10 border-blue-500/50 text-blue-400" :
                    "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                  )}>
                    {size.w >= 1536 ? "2XL" : size.w >= 1280 ? "XL" : "LG"}
                  </span>
                </div>
                
                <div 
                  className="relative overflow-hidden rounded-2xl border-2 border-white/10 bg-black shadow-2xl transition-all group-hover:border-primary/50"
                  style={{ width: '100%', aspectRatio: `${size.w}/${size.h}`, maxWidth: `${size.w}px` }}
                >
                  <iframe 
                    src="/tv/clinica-qa-teste?debug=true" 
                    className="absolute inset-0 h-[200%] w-[200%] origin-top-left scale-[0.5] pointer-events-none"
                    title={`TV ${size.w}px`}
                  />
                  <div className="absolute top-4 right-4 z-10 rounded bg-black/80 px-2 py-1 text-[10px] font-mono backdrop-blur-md">
                    Target: {size.w}px
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ATENDIMENTO SECTION */}
        <div>
          <div className="flex items-end justify-between mb-8 border-t border-white/5 pt-12">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-bold">
                <Maximize2 className="h-6 w-6 text-emerald-500" />
                Workspace Atendimento
              </h2>
              <p className="text-sm text-slate-500">Validação da expansão horizontal (Max Width: 1600px)</p>
            </div>
          </div>

          <div className="space-y-12">
            {[1280, 1600, 1920].map((w) => (
              <div key={`atend-${w}`} className="group space-y-3">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-black uppercase tracking-tighter text-slate-500">LARGURA: {w}px</span>
                  <div className="h-px flex-1 mx-4 bg-white/5" />
                </div>
                
                <div 
                  className="relative overflow-hidden rounded-2xl border-2 border-white/10 bg-slate-900 shadow-2xl transition-all group-hover:border-emerald-500/50 mx-auto"
                  style={{ width: `${w}px`, height: "600px", maxWidth: '100%' }}
                >
                  <iframe 
                    src="/app/atendimento" 
                    className="h-full w-full"
                    title={`Atendimento ${w}px`}
                  />
                  {/* Régua de marcação de 1280px se o monitor for maior */}
                  {w > 1280 && (
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1280px] border-x border-dashed border-white/10 pointer-events-none">
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-white/10 px-2 py-0.5 rounded text-[8px] font-bold">LIMITE PADRÃO (1280px)</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mt-20 border-t border-white/5 pt-10 text-center text-slate-500 text-xs pb-10">
        FilaMed Validation Suite • © 2024
      </footer>
    </div>
  );
}
