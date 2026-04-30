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
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Mesh Gradient Background Decor */}
      <div className="absolute left-1/2 top-0 -z-10 h-[400px] w-full -translate-x-1/2 bg-gradient-hero opacity-50" aria-hidden="true" />

      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="animate-fade-up">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary/80">
            <span className="h-[1px] w-8 bg-primary/30" />
            Dashboard
          </div>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Olá, <span className="text-gradient">{profile?.nome_completo?.split(' ')[0]}</span>!
          </h1>
          <div className="mt-3 flex items-center gap-3 text-muted-foreground">
            {unidadeNome && (
              <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1 text-sm font-medium ring-1 ring-border/50">
                <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                {unidadeNome}
              </div>
            )}
            <p className="text-sm">Que bom ver você hoje.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 animate-fade-in delay-200">
          {roles.length === 0 ? (
            <Badge variant="outline" className="h-8 px-4 rounded-full border-dashed">Sem perfil atribuído</Badge>
          ) : (
            roles.map((r) => (
              <Badge 
                key={r} 
                className="h-8 rounded-full bg-background px-4 text-xs font-bold uppercase tracking-wider text-foreground ring-1 ring-border shadow-soft transition-transform hover:-translate-y-0.5"
              >
                {r}
              </Badge>
            ))
          )}
        </div>
      </div>

      {unidadeId && roles.includes("admin") && (
        <div className="mt-10 animate-fade-up delay-300">
          <OnboardingChecklist unidadeId={unidadeId} unidadeSlug={unidadeSlug} />
        </div>
      )}

      <div className="mt-12 animate-fade-up delay-500">{renderWidgets()}</div>
    </div>
  );
}
