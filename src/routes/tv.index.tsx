import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Loader2, Tv } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Unidade = { id: string; nome: string; slug: string };

export const Route = createFileRoute("/tv/")({
  head: () => ({
    meta: [
      { title: "Painéis TV — FilaMed" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TvIndexPage,
});

function TvIndexPage() {
  const [unidades, setUnidades] = useState<Unidade[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("[TV Index] iniciando carregamento de unidades...");
    void (async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc("get_unidades_publicas");
        console.log("[TV Index] resultado rpc:", { data, rpcError });
        if (rpcError) throw rpcError;
        setUnidades((data ?? []) as Unidade[]);
      } catch (err) {
        console.error("[TV Index] falha ao carregar unidades:", err);
        setError("Não foi possível carregar as unidades. Tente novamente mais tarde.");
        setUnidades([]);
      }
    })();
  }, []);



  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-900/50">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-8 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Activity className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">
              FilaMed Painel
            </p>
            <h1 className="font-display text-lg font-bold">Selecione uma unidade</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-8 py-12">
        {unidades === null ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : unidades.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-10 text-center text-slate-400">
            Nenhuma unidade ativa encontrada.
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {unidades.map((u) => (
              <li key={u.id}>
                <Link
                  to="/tv/$slug"
                  params={{ slug: u.slug }}
                  className="group block rounded-2xl border border-white/10 bg-slate-900 p-6 transition-all hover:border-primary/40 hover:bg-slate-800 hover:shadow-glow"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 group-hover:bg-primary/20">
                      <Tv className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-display font-semibold">{u.nome}</h2>
                      <p className="font-mono text-xs text-slate-400">/tv/{u.slug}</p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-10 text-center text-xs text-slate-500">
          Acesse diretamente <span className="font-mono text-slate-300">/tv/&lt;slug-da-unidade&gt;</span> em uma TV ou tablet.
        </p>
      </main>
    </div>
  );
}
