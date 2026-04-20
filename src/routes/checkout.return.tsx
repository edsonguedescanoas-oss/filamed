import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (search: Record<string, unknown>) => ({
    session_id: (search.session_id as string) || "",
  }),
  head: () => ({
    meta: [
      { title: "Pagamento confirmado — FilaMed" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutReturnPage,
});

function CheckoutReturnPage() {
  const { session_id } = useSearch({ from: "/checkout/return" });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="flex min-h-[70vh] items-center justify-center px-6 pt-32 pb-24">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <h1 className="mt-6 font-display text-3xl font-bold">
            Trial ativado!
          </h1>
          <p className="mt-4 text-muted-foreground">
            Sua assinatura está em período de teste por 14 dias. Você só será cobrado
            no fim do trial e pode cancelar a qualquer momento pelo painel da conta.
          </p>
          {session_id && (
            <p className="mt-3 text-xs text-muted-foreground/70">
              ID da sessão: <code className="font-mono">{session_id.slice(0, 24)}…</code>
            </p>
          )}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="group">
              <Link to="/app">
                Ir para o painel
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/app/conta">Ver minha conta</Link>
            </Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
