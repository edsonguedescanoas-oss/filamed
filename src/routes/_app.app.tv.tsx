import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { TvAparenciaForm } from "@/components/voz/tv-aparencia-form";

export const Route = createFileRoute("/_app/app/tv")({
  head: () => ({
    meta: [{ title: "TV / Painel — FilaMed" }],
  }),
  component: TvConfigPage,
});

function TvConfigPage() {
  const { profile, roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const unidadeId = profile?.unidade_id ?? null;
  const [unidadeSlug, setUnidadeSlug] = useState<string | null>(null);
  const [loadingSlug, setLoadingSlug] = useState(true);

  useEffect(() => {
    if (!unidadeId) {
      setLoadingSlug(false);
      return;
    }
    let mounted = true;
    void (async () => {
      const { data } = await supabase
        .from("unidades")
        .select("slug")
        .eq("id", unidadeId)
        .maybeSingle();
      if (mounted) {
        setUnidadeSlug(data?.slug ?? null);
        setLoadingSlug(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [unidadeId]);

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12 text-center">
        <h1 className="font-display text-2xl font-bold">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Apenas administradores da unidade podem configurar a aparência da TV.
        </p>
      </div>
    );
  }

  if (!unidadeId || loadingSlug) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <TvAparenciaForm unidadeId={unidadeId} unidadeSlug={unidadeSlug} />
    </div>
  );
}
