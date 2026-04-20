import { Outlet, Link, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";
import { loadInitialAuth, type AuthSnapshot } from "@/lib/auth-store";

export interface RouterContext {
  auth: AuthSnapshot;
}

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar para o início
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  // Garante que o snapshot de auth está pronto antes de qualquer guard avaliar.
  // Idempotente — só faz fetch na primeira chamada por sessão de browser.
  beforeLoad: async () => {
    await loadInitialAuth();
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "FilaMed" },
      { name: "description", content: "FilaMed is a smart queue management system for healthcare units, enhancing efficiency and patient experience." },
      { name: "author", content: "Lovable" },
      // Performance & UX hints
      { name: "theme-color", content: "#0F172A" },
      { name: "color-scheme", content: "light dark" },
      { name: "format-detection", content: "telephone=no" },
      // Security: equivalentes aplicáveis via meta (X-Frame-Options/CSP completos exigem headers HTTP do Worker)
      { name: "referrer", content: "strict-origin-when-cross-origin" },
      { httpEquiv: "X-Content-Type-Options", content: "nosniff" },
      { property: "og:title", content: "FilaMed" },
      { property: "og:description", content: "FilaMed is a smart queue management system for healthcare units, enhancing efficiency and patient experience." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "FilaMed" },
      { name: "twitter:description", content: "FilaMed is a smart queue management system for healthcare units, enhancing efficiency and patient experience." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e67bc46c-29ad-48f0-b752-90031a456b5f/id-preview-7bcdc357--f9c526a2-791e-4734-b125-a453aaf7e0b3.lovable.app-1776469186793.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e67bc46c-29ad-48f0-b752-90031a456b5f/id-preview-7bcdc357--f9c526a2-791e-4734-b125-a453aaf7e0b3.lovable.app-1776469186793.png" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      // Google Fonts: preload assíncrono (não bloqueia render).
      // O <script> abaixo promove para stylesheet quando carregado.
      // Fallback noscript no body garante fontes mesmo sem JS.
      {
        rel: "preload",
        as: "style",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@500;600;700;800&display=swap",
        id: "gf-async",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
    scripts: [
      {
        children:
          "(function(){var l=document.getElementById('gf-async');if(l){l.rel='stylesheet';}})();",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster richColors position="top-right" />
    </AuthProvider>
  );
}
