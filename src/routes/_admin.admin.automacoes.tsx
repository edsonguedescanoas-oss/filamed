import { createFileRoute } from "@tanstack/react-router";
import AutomacoesManager from "@/components/Operacao/Automacoes/AutomacoesManager";

export const Route = createFileRoute("/_admin/admin/automacoes")({
  component: AutomacoesPage,
});

function AutomacoesPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <AutomacoesManager />
    </div>
  );
}
