import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  AdminWidgets,
  RecepcaoWidgets,
  AtendimentoWidgets,
  GestorWidgets,
  EmptyDashboard,
} from "@/components/dashboard/widgets";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";

export const Route = createFileRoute("/_app/app/")({
  head: () => ({ meta: [{ title: "Dashboard — FilaMed" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { profile, roles } = useAuth();
  const [unidadeNome, setUnidadeNome] = useState<string | null>(null);
  const [unidadeSlug, setUnidadeSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.unidade_id) return;
    void supabase
      .from("unidades")
      .select("nome, slug")
      .eq("id", profile.unidade_id)
      .maybeSingle()
      .then(({ data }) => {
        setUnidadeNome(data?.nome ?? null);
        setUnidadeSlug(data?.slug ?? null);
      });
  }, [profile?.unidade_id]);

  const unidadeId = profile?.unidade_id ?? null;

  // Prioridade de exibição: admin > gestor > recepção > médico/enfermeiro
  const renderWidgets = () => {
    if (!unidadeId) return null;
    if (roles.includes("admin")) return <AdminWidgets unidadeId={unidadeId} />;
    if (roles.includes("gestor")) return <GestorWidgets unidadeId={unidadeId} />;
    if (roles.includes("recepcao")) return <RecepcaoWidgets unidadeId={unidadeId} />;
    if (roles.includes("medico") || roles.includes("enfermeiro"))
      return <AtendimentoWidgets unidadeId={unidadeId} />;
    return <EmptyDashboard />;
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Bem-vindo de volta
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold">{profile?.nome_completo}</h1>
          {unidadeNome && <p className="mt-1 text-muted-foreground">{unidadeNome}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {roles.length === 0 ? (
            <Badge variant="outline">Sem perfil atribuído</Badge>
          ) : (
            roles.map((r) => (
              <Badge key={r} className="bg-gradient-primary capitalize">
                {r}
              </Badge>
            ))
          )}
        </div>
      </div>

      {unidadeId && roles.includes("admin") && (
        <div className="mt-8">
          <OnboardingChecklist unidadeId={unidadeId} unidadeSlug={unidadeSlug} />
        </div>
      )}

      <div className="mt-10">{renderWidgets()}</div>
    </div>
  );
}
