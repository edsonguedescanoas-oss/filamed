import { Activity } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary">
                <Activity className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
              </div>
              <span className="font-display text-lg font-semibold">
                Fila<span className="text-gradient">Med</span>
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              Plataforma SaaS de gestão inteligente de filas para clínicas, hospitais e redes de saúde.
            </p>
          </div>

          <div>
            <h4 className="font-semibold">Contato</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><a href="mailto:contato@filamed.app" className="hover:text-foreground">contato@filamed.app</a></li>
              <li><a href="tel:+5500000000000" className="hover:text-foreground">+55 (00) 0000-0000</a></li>
              <li>Atendimento 24/7</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold">Produto</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/precos" className="hover:text-foreground">Preços</Link></li>
              <li><Link to="/casos" className="hover:text-foreground">Casos de uso</Link></li>
              <li><Link to="/" hash="como-comecar" className="hover:text-foreground">Como começar</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold">Recursos</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" hash="arquitetura" className="hover:text-foreground">Arquitetura</Link></li>
              <li><Link to="/" hash="beneficios" className="hover:text-foreground">Benefícios</Link></li>
              <li><Link to="/login" className="hover:text-foreground">Entrar no painel</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} FilaMed. Todos os direitos reservados.</span>
          <span>Construído para unidades de saúde modernas.</span>
        </div>
      </div>
    </footer>
  );
}
