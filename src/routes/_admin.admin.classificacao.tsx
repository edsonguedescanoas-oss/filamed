import { createFileRoute } from "@tanstack/react-router";
import { CriteriaEditor } from "@/components/admin/CriteriaEditor";

export const Route = createFileRoute("/_admin/admin/classificacao")({
  head: () => ({
    meta: [{ title: "Admin · Classificação — FilaMed" }],
  }),
  component: AdminClassificacaoPage,
});

function AdminClassificacaoPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Critérios de Classificação</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Defina as regras para classificação automática de risco. Os pacientes serão triados com base nestes critérios.
        </p>
      </div>

      <CriteriaEditor />
    </div>
  );
}
