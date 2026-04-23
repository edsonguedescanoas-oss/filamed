import { createFileRoute } from "@tanstack/react-router";
import { Monitor } from "lucide-react";

export const Route = createFileRoute("/test/horizontal")({
  component: TestHorizontalPage,
});

const SIZES = [1024, 1280, 1440, 1920];

function TestHorizontalPage() {
  return (
    <div className="min-h-screen bg-slate-950 p-8 text-white">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Validação Horizontal</h1>
          <p className="text-slate-400">Garantindo que o layout não quebre em resoluções intermediárias.</p>
        </div>
      </header>

      <section className="space-y-16">
        <div>
          <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-primary">
            <Monitor className="h-5 w-5" />
            TV (Painel) — Diferentes Larguras
          </h2>
          <div className="flex flex-col gap-8">
            {SIZES.map((width) => (
              <div key={`tv-${width}`} className="space-y-2">
                <div className="flex items-center justify-between px-2 text-xs font-mono text-slate-500 uppercase">
                  <span>Largura: {width}px</span>
                  <span>Breakpoint: {width >= 1536 ? "2XL" : width >= 1280 ? "XL" : "LG"}</span>
                </div>
                <div 
                  className="overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-2xl"
                  style={{ width: `${width}px`, height: "450px" }}
                >
                  <iframe 
                    src="/tv/clinica-qa-teste" 
                    className="h-full w-full pointer-events-none scale-[1] origin-top-left"
                    title={`TV ${width}px`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-emerald-500">
            <Monitor className="h-5 w-5" />
            Atendimento — Diferentes Larguras
          </h2>
          <div className="flex flex-col gap-8">
            {SIZES.map((width) => (
              <div key={`atend-${width}`} className="space-y-2">
                <div className="flex items-center justify-between px-2 text-xs font-mono text-slate-500 uppercase">
                  <span>Largura: {width}px</span>
                </div>
                <div 
                  className="overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-2xl"
                  style={{ width: `${width}px`, height: "600px" }}
                >
                  <iframe 
                    src="/app/atendimento" 
                    className="h-full w-full pointer-events-none"
                    title={`Atendimento ${width}px`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
