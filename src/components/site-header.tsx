import { Link } from "@tanstack/react-router";
import { Activity, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { to: "/", hash: "funcionalidades", label: "Funcionalidades" },
    { to: "/", hash: "reports-showcase", label: "Relatórios" },
    { to: "/demo", label: "Demonstração" },
    { to: "/precos", label: "Preços" },
    { to: "/casos", label: "Casos" },
  ];

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
          {navLinks.map((link) => (
            <Link 
              key={link.label}
              to={link.to} 
              hash={link.hash}
              className="hover:text-foreground transition-colors"
              activeProps={{ className: "text-foreground font-medium" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <a href="#cta">Falar com especialista</a>
            </Button>
            <Button asChild size="sm" className="bg-gradient-primary hover:opacity-90 shadow-soft">
              <a href="#cta">Solicitar demonstração</a>
            </Button>
          </div>

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetTitle className="flex items-center gap-2 mb-8">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
                  <Activity className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-display text-lg font-bold">FilaMed</span>
              </SheetTitle>
              <nav className="flex flex-col gap-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    to={link.to}
                    hash={link.hash}
                    onClick={() => setIsOpen(false)}
                    className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border">
                  <Button asChild variant="ghost" className="justify-start px-0 hover:bg-transparent">
                    <a href="#cta" onClick={() => setIsOpen(false)}>Falar com especialista</a>
                  </Button>
                  <Button asChild className="bg-gradient-primary w-full">
                    <a href="#cta" onClick={() => setIsOpen(false)}>Solicitar demonstração</a>
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
