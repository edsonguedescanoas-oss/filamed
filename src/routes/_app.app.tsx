import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, ListOrdered, Megaphone, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/app")({
  head: () => ({ meta: [{ title: "Dashboard — FilaMed" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { profile, roles } = useAuth();
  const [unidadeNome, setUnidadeNome] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.unidade_id) return;
    void supabase
      .from("unidades")
      .select("nome")
      .eq("id", profile.unidade_id)
      .maybeSingle()
      .then(({ data }) => setUnidadeNome(data?.nome ?? null));
  }, [profile?.unidade_id]);

  const cards = [
    { icon: Users, title: "Pacientes", desc: "Cadastro e histórico", count: "—" },
    { icon: ListOrdered, title: "Filas ativas", desc: "Senhas em tempo real", count: "—" },
    { icon: Megaphone, title: "Chamadas hoje", desc: "Painel de TV", count: "—" },
    { icon: BarChart3, title: "Tempo médio", desc: "Espera no atendimento", count: "—" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Bem-vindo de volta
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold">{profile?.nome_completo}</h1>
          {unidadeNome && (
            <p className="mt-1 text-muted-foreground">
              {unidadeNome}
            </p>
          )}
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

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.title}
            className="rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elegant"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <c.icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="mt-5 font-display text-3xl font-bold">{c.count}</div>
            <div className="mt-1 font-medium">{c.title}</div>
            <div className="text-sm text-muted-foreground">{c.desc}</div>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
        <h3 className="font-display text-lg font-semibold">Próximos módulos</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
          Cadastro de pacientes, geração de senhas, painel de TV em modo quiosque e
          acompanhamento pelo paciente serão habilitados aqui nos próximos passos.
        </p>
      </div>
    </div>
  );
}
