import { QrCode, Bell, Globe, BarChart3, Tv, Layers, Plug } from "lucide-react";

const items = [
  { icon: QrCode, label: "Entrada via QR Code" },
  { icon: Bell, label: "Notificações multicanal" },
  { icon: Globe, label: "WebApp sem instalação" },
  { icon: BarChart3, label: "Analytics em tempo real" },
  { icon: Tv, label: "Sinalização digital integrada" },
  { icon: Layers, label: "Múltiplas filas simultâneas" },
  { icon: Plug, label: "Integração total com sistemas existentes" },
];

export function Differentials() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center reveal">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Diferenciais</span>
          <h2 className="mt-3 text-3xl font-bold sm:text-5xl">
            O que coloca o FilaMed à frente.
          </h2>
        </div>

        <div className="mt-14 flex flex-wrap justify-center gap-3">
          {items.map((it, i) => (
            <div
              key={it.label}
              className="reveal group inline-flex items-center gap-2.5 rounded-full border border-border bg-gradient-card px-5 py-3 text-sm font-medium shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elegant"
              style={{ transitionDelay: `${i * 50}ms` }}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground">
                <it.icon className="h-3.5 w-3.5" />
              </span>
              {it.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
