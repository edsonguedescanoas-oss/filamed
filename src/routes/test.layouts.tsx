import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Monitor, Smartphone, Tablet, Layout, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/test/layouts")({
  component: TestLayoutsPage,
});

const SIZES = [
  { name: "1024px", width: 1024, icon: Tablet },
  { name: "1280px (HD)", width: 1280, icon: Monitor },
  { name: "1440px (FHD)", width: 1440, icon: Monitor },
  { name: "1600px", width: 1600, icon: Monitor },
  { name: "1920px (FHD)", width: 1920, icon: Monitor },
  { name: "2560px (QHD)", width: 2560, icon: Monitor },
];

const PAGES = [
  { name: "TV (Painel)", path: "/tv/clinica-qa-teste" },
  { name: "Atendimento (Workspace)", path: "/app/atendimento" },
  { name: "Recepção", path: "/app/recepcao" },
  { name: "Dashboard", path: "/app" },
];

function TestLayoutsPage() {
  const [selectedPage, setSelectedPage] = useState(PAGES[0]);
  const [selectedSize, setSelectedSize] = useState(SIZES[2]); // 1440px

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header fixo com controles */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="h-6 w-px bg-border" />
            <h1 className="font-display font-bold">Validação de Layout Horizontal</h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Página:</span>
              <div className="flex gap-1">
                {PAGES.map((p) => (
                  <Button
                    key={p.path}
                    variant={selectedPage.path === p.path ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPage(p)}
                    className="h-8"
                  >
                    {p.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Tamanho:</span>
              <div className="flex gap-1">
                {SIZES.map((s) => (
                  <Button
                    key={s.width}
                    variant={selectedSize.width === s.width ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSize(s)}
                    className="h-8 gap-2"
                  >
                    <s.icon className="h-3.5 w-3.5" />
                    {s.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-col items-center py-10 px-6">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold">{selectedPage.name}</h2>
          <p className="text-sm text-muted-foreground">
            Visualizando em {selectedSize.name} ({selectedSize.width}px de largura). 
            Se a página pedir login, faça login em outra aba e recarregue.
          </p>
        </div>

        {/* Container do Iframe com largura fixa simulada */}
        <div 
          className="relative overflow-hidden rounded-xl border-4 border-muted-foreground/20 bg-background shadow-2xl transition-all duration-300 ease-in-out"
          style={{ width: `${selectedSize.width}px`, height: "800px" }}
        >
          {/* Overlay de régua */}
          <div className="absolute inset-x-0 top-0 h-1 bg-primary/20" />
          <div className="absolute inset-y-0 left-0 w-1 bg-primary/20" />
          
          <iframe 
            src={selectedPage.path}
            className="h-full w-full border-none"
            title="Layout Preview"
          />
        </div>

        {/* Legenda de Breakpoints Tailwind */}
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          {[
            { label: "SM (640px)", min: 640 },
            { label: "MD (768px)", min: 768 },
            { label: "LG (1024px)", min: 1024 },
            { label: "XL (1280px)", min: 1280 },
            { label: "2XL (1536px)", min: 1536 },
          ].map((bp) => (
            <div 
              key={bp.label}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium border",
                selectedSize.width >= bp.min ? "bg-primary/10 border-primary text-primary" : "bg-muted border-transparent text-muted-foreground"
              )}
            >
              <Layout className="h-3 w-3" />
              {bp.label}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
