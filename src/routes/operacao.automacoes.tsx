import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/role-guard";
import AutomacoesManager from "@/components/Operacao/Automacoes/AutomacoesManager";

export const Route = createFileRoute("/operacao/automacoes")({
  component: () => (
    <RoleGuard permission="manage_users" path="/operacao/automacoes">
      <div className="flex flex-col h-screen bg-background overflow-y-auto">
        <main className="flex-1 p-6 bg-muted/10">
          <div className="max-w-6xl mx-auto">
            <AutomacoesManager />
          </div>
        </main>
      </div>
    </RoleGuard>
  ),
});
