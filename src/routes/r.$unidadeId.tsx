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
  head: () => ({
    meta: [
      { title: "Avaliar atendimento — FilaMed" },
      {
        name: "description",
        content: "Redirecionando você para a página de avaliação no Google.",
      },
      // Link curto/transacional: não indexar.
      { name: "robots", content: "noindex, nofollow, noarchive, nosnippet" },
      { name: "googlebot", content: "noindex, nofollow" },
      { name: "theme-color", content: "#0F172A" },
      { name: "referrer", content: "strict-origin-when-cross-origin" },
      // Preview no WhatsApp (caso o link seja exibido sem redirect imediato).
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "FilaMed" },
      { property: "og:locale", content: "pt_BR" },
      { property: "og:title", content: "Avalie seu atendimento ⭐" },
      {
        property: "og:description",
        content: "Sua opinião ajuda a clínica a melhorar. Toque para avaliar no Google.",
      },
      { property: "twitter:card", content: "summary" },
      { property: "twitter:title", content: "Avalie seu atendimento ⭐" },
      {
        property: "twitter:description",
        content: "Sua opinião ajuda a clínica a melhorar.",
      },
    ],
    links: [{ rel: "canonical", href: "https://filamed.com.br" }],
  }),
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
            // Renderiza fallback ao invés de quebrar
            return new Response(renderFallbackHtml("Erro ao buscar unidade. Tente novamente."), {
              status: 200,
              headers: { "Content-Type": "text/html; charset=utf-8" },
            });
          }

          if (!data?.google_review_url) {
            return new Response(
              renderFallbackHtml(
                "Não foi possível encontrar uma URL de avaliação configurada para esta unidade. Entre em contato com a recepção."
              ),
              {
                status: 200,
                headers: { "Content-Type": "text/html; charset=utf-8" },
              }
            );
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
          return new Response(renderFallbackHtml("Erro interno ao processar o link."), {
            status: 200,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }
      },
    },
  },
  component: FallbackComponent,
});

function renderFallbackHtml(message: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Avaliação indisponível — FilaMed</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0F172A;
      color: #F8FAFC;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .card {
      max-width: 28rem;
      text-align: center;
    }
    h1 { font-size: 1.5rem; margin: 0 0 0.75rem; }
    p { color: #94A3B8; line-height: 1.5; margin: 0 0 1.5rem; }
    a {
      display: inline-block;
      padding: 0.625rem 1.25rem;
      background: #3B82F6;
      color: #fff;
      text-decoration: none;
      border-radius: 0.5rem;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Link de avaliação indisponível</h1>
    <p>${message}</p>
    <a href="/">Voltar ao início</a>
  </div>
</body>
</html>`;
}

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
