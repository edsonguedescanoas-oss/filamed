import { Link } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 glass">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow transition-transform group-hover:scale-105">
            <Activity className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">
            Fila<span className="text-gradient">Med</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
          <Link to="/" hash="funcionalidades" className="hover:text-foreground transition-colors">Funcionalidades</Link>
          <Link to="/precos" className="hover:text-foreground transition-colors" activeProps={{ className: "text-foreground font-medium" }}>Preços</Link>
          <Link to="/casos" className="hover:text-foreground transition-colors" activeProps={{ className: "text-foreground font-medium" }}>Casos</Link>
          <Link to="/" hash="como-comecar" className="hover:text-foreground transition-colors">Como começar</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <a href="#cta">Falar com especialista</a>
          </Button>
          <Button asChild size="sm" className="bg-gradient-primary hover:opacity-90 shadow-soft">
            <a href="#cta">Solicitar demonstração</a>
          </Button>
        </div>
      </div>
    </header>
  );
}
