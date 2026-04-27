import { createFileRoute, Link } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Rota de redirecionamento curta para avaliação no Google.
 * URL: /r/{unidade_id}
 *
 * Quando o paciente clica no link enviado por WhatsApp,
 * o servidor faz um 302 direto para a URL de avaliação configurada
 * na unidade (google_review_url), mantendo a mensagem do WhatsApp limpa.
 */
export const Route = createFileRoute("/r/$unidadeId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const { data, error } = await supabaseAdmin
            .from("unidades")
            .select("google_review_url, nome")
            .eq("id", params.unidadeId)
            .maybeSingle();

          if (error) {
            console.error("[/r/:unidadeId] DB error:", error);
            return new Response("Erro interno", { status: 500 });
          }

          if (!data?.google_review_url) {
            // Cai no FallbackComponent
            return new Response(null, { status: 404 });
          }

          return new Response(null, {
            status: 302,
            headers: {
              Location: data.google_review_url,
              "Cache-Control": "no-store",
            },
          });
        } catch (err) {
          console.error("[/r/:unidadeId] handler exception:", err);
          return new Response("Erro interno", { status: 500 });
        }
      },
    },
  },
  component: FallbackComponent,
  notFoundComponent: FallbackComponent,
});

function FallbackComponent() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Link de avaliação indisponível</h1>
        <p className="text-muted-foreground">
          Não foi possível encontrar uma URL de avaliação configurada para esta unidade.
          Entre em contato com a recepção.
        </p>
        <Link to="/" className="inline-block text-primary hover:underline">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
