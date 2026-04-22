import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { RecursoGate } from "@/components/recurso-gate";
import { RelatoriosCompletos } from "@/components/relatorios/relatorios-completos";

export const Route = createFileRoute("/_app/app/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — FilaMed" }] }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const { profile } = useAuth();
  const unidadeId = profile?.unidade_id ?? null;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
          <BarChart3 className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Operação
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold">Relatórios</h1>
          <p className="mt-1 text-muted-foreground">
            Análise diária da operação: volume, tempos, gargalos e produtividade.
          </p>
        </div>
      </div>

      <div className="mt-8">
        {unidadeId ? (
          <RecursoGate
            recurso="relatorios_avancados"
            titulo="Relatórios avançados"
            descricao="Tenha visibilidade total da sua operação dia a dia: volume por consultório, tempos médios de espera e atendimento, gargalos identificados, produtividade por profissional e exportação para CSV."
            beneficios={[
              "Gráficos diários de senhas, atendimentos e conclusão",
              "Tempo médio de espera e de atendimento por dia e fila",
              "Distribuição por hora do dia para identificar picos",
              "Produtividade por profissional / consultório",
              "Detecção automática de gargalos operacionais",
              "Exportação CSV completa para análises externas",
            ]}
          >
            <RelatoriosCompletos unidadeId={unidadeId} />
          </RecursoGate>
        ) : (
          <p className="text-muted-foreground">Carregando...</p>
        )}
      </div>
    </div>
  );
}
