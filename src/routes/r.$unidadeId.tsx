import { createFileRoute, Link } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

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
        const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
        const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

        if (!supabaseUrl || !supabaseKey) {
          return new Response("Configuração indisponível", { status: 500 });
        }

        const client = createClient(supabaseUrl, supabaseKey);

        const { data, error } = await client
          .from("unidades")
          .select("google_review_url, nome")
          .eq("id", params.unidadeId)
          .maybeSingle();

        if (error || !data?.google_review_url) {
          // Renderiza a página de fallback (componente abaixo)
          return new Response(null, { status: 404 });
        }

        return new Response(null, {
          status: 302,
          headers: {
            Location: data.google_review_url,
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
  component: FallbackComponent,
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
