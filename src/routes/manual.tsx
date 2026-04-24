import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock, PlayCircle, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { manualRoles, manualSections, manualStats, roleOrder, type ManualRole } from "@/lib/manual-content";

export const Route = createFileRoute("/manual")({
  head: () => ({
    meta: [
      { title: "Manual Online FilaMed — Treinamento por Perfil" },
      {
        name: "description",
        content: "Manual online do FilaMed com busca, seções por perfil, videoaulas curtas e checklists de conclusão.",
      },
      { property: "og:title", content: "Manual Online FilaMed — Treinamento por Perfil" },
      {
        property: "og:description",
        content: "Treinamento atualizado para admin, gestor, atendente e equipe clínica sem baixar novo PDF.",
      },
    ],
  }),
  component: ManualPage,
});

function ManualPage() {
  const [query, setQuery] = useState("");
  const [activeRole, setActiveRole] = useState<ManualRole | "todos">("todos");

  const filteredSections = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return manualSections.filter((section) => {
      const roleMatches = activeRole === "todos" || section.role === activeRole;
      if (!normalized) return roleMatches;
      const haystack = [
        section.title,
        section.summary,
        section.videoTitle,
        section.videoDescription,
        ...section.steps,
        ...section.checklist,
        ...section.examples,
        ...section.keywords,
      ]
        .join(" ")
        .toLowerCase();
      return roleMatches && haystack.includes(normalized);
    });
  }, [activeRole, query]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="pt-24">
        <section className="border-b border-border bg-gradient-subtle">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/10 text-primary">
                Manual online
              </Badge>
              <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                Treinamento FilaMed por perfil, sempre atualizado
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                Busque procedimentos, siga a ordem sugerida de estudo e conclua checklists práticos para acelerar a capacitação da equipe.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {manualStats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                  <stat.icon className="h-5 w-5 text-primary" />
                  <div className="mt-3 text-2xl font-semibold tabular-nums">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por fila, WhatsApp, permissões, relatórios..."
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant={activeRole === "todos" ? "default" : "outline"} size="sm" onClick={() => setActiveRole("todos")}>
                Todos
              </Button>
              {manualRoles.map((role) => (
                <Button
                  key={role.id}
                  variant={activeRole === role.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveRole(role.id)}
                >
                  <role.icon className="mr-1.5 h-4 w-4" />
                  {role.label}
                </Button>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-6 pb-16 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            {manualRoles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => setActiveRole(role.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  activeRole === role.id ? "border-primary bg-primary/10 shadow-soft" : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <role.icon className="h-5 w-5" />
                  </span>
                  <span className="font-semibold">{role.label}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{role.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {roleOrder[role.id].map((sectionId, index) => (
                    <Badge key={sectionId} variant="secondary" className="text-[10px] uppercase">
                      Aula {index + 1}
                    </Badge>
                  ))}
                </div>
              </button>
            ))}
          </aside>

          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-semibold">Seções do manual</h2>
                <p className="text-sm text-muted-foreground">{filteredSections.length} resultado(s) encontrados</p>
              </div>
              {(query || activeRole !== "todos") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setQuery("");
                    setActiveRole("todos");
                  }}
                >
                  Limpar filtros
                </Button>
              )}
            </div>

            {filteredSections.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
                <p className="font-medium">Nenhuma seção encontrada.</p>
                <p className="mt-2 text-sm text-muted-foreground">Tente buscar por outro termo ou selecione todos os perfis.</p>
              </div>
            ) : (
              filteredSections.map((section) => {
                const role = manualRoles.find((item) => item.id === section.role);
                const order = roleOrder[section.role].indexOf(section.id) + 1;
                return (
                  <article key={section.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
                    <div className="border-b border-border bg-muted/30 p-5 sm:p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            {role && (
                              <Badge variant="outline" className="border-primary/30 text-primary">
                                {role.label}
                              </Badge>
                            )}
                            <Badge variant="secondary">Ordem {order}</Badge>
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              {section.duration}
                            </span>
                          </div>
                          <h3 className="mt-3 font-display text-xl font-semibold">{section.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.summary}</p>
                        </div>
                        <div className="rounded-xl border border-border bg-background p-3 sm:max-w-xs">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <PlayCircle className="h-4 w-4 text-primary" />
                            {section.videoTitle}
                          </div>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">{section.videoDescription}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[1fr_0.9fr]">
                      <div>
                        <h4 className="text-sm font-semibold uppercase text-muted-foreground">Passo a passo</h4>
                        <ol className="mt-3 space-y-3">
                          {section.steps.map((step, index) => (
                            <li key={step} className="flex gap-3 text-sm leading-6">
                              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                {index + 1}
                              </span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>

                      <div className="space-y-5">
                        <div>
                          <h4 className="text-sm font-semibold uppercase text-muted-foreground">Checklist de conclusão</h4>
                          <ul className="mt-3 space-y-2">
                            {section.checklist.map((item) => (
                              <li key={item} className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-success" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold uppercase text-muted-foreground">Exemplo prático</h4>
                          {section.examples.map((example) => (
                            <p key={example} className="mt-3 rounded-xl bg-muted/40 p-3 text-sm leading-6 text-muted-foreground">
                              {example}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}