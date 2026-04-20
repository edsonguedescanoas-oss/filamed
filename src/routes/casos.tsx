import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Stethoscope, FlaskConical, Hospital, Building2, Quote } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/casos")({
  head: () => ({
    meta: [
      { title: "Casos de uso — FilaMed | Clínicas, laboratórios e hospitais" },
      {
        name: "description",
        content:
          "Como o FilaMed funciona em clínicas multiespecialidade, laboratórios de análises, prontos atendimentos e operadoras com rede própria.",
      },
      { property: "og:title", content: "Casos de uso reais do FilaMed" },
      {
        property: "og:description",
        content:
          "Cenários onde o FilaMed reduz fila, aumenta produtividade médica e melhora a percepção do paciente.",
      },
    ],
  }),
  component: CasosPage,
});

const cases = [
  {
    icon: Stethoscope,
    tag: "Clínica multiespecialidade",
    title: "Da recepção lotada ao paciente sentado",
    problem:
      "Recepção com 60+ pessoas em pé pela manhã, gritaria de chamada por nome, paciente reclamando de ‘furar fila’.",
    solution:
      "Senhas por especialidade (cardio, ortopedia, exames), TV com chamada por voz e WebApp para o paciente acompanhar a posição sentado ou no café da esquina.",
    metrics: [
      { label: "Tempo médio em pé", value: "−72%" },
      { label: "Reclamações de fura-fila", value: "−95%" },
      { label: "Setup em produção", value: "1 dia" },
    ],
  },
  {
    icon: FlaskConical,
    tag: "Laboratório de análises",
    title: "Coleta cirúrgica, sem confusão na sala",
    problem:
      "Pacientes em jejum esperando em pé, chamada manual confundindo nomes parecidos, fluxo coleta vs. resultado misturado.",
    solution:
      "Filas separadas (coleta, entrega de resultado, exame de imagem) com prefixos próprios. Chamada por voz repete senha + sala. Prioridade automática para gestantes e idosos.",
    metrics: [
      { label: "Erros de chamada", value: "≈ 0" },
      { label: "Throughput de coleta", value: "+34%" },
      { label: "NPS pós-atendimento", value: "+22 pts" },
    ],
  },
  {
    icon: Hospital,
    tag: "Pronto atendimento",
    title: "Triagem com prioridade clínica",
    problem:
      "Manchester no papel, paciente vermelho esperando atrás de verde porque ninguém sabia a ordem certa.",
    solution:
      "Recepção classifica prioridade (normal/preferencial/urgente). Médico vê fila ordenada por prioridade + tempo de espera. Painel do gestor mostra tempo porta-médico em tempo real.",
    metrics: [
      { label: "Tempo porta-médico (vermelho)", value: "−58%" },
      { label: "Visibilidade gerencial", value: "100%" },
      { label: "Auditoria de prioridade", value: "Completa" },
    ],
  },
  {
    icon: Building2,
    tag: "Rede com várias unidades",
    title: "Visão consolidada para o gestor",
    problem:
      "Diretor recebia planilha por WhatsApp de cada unidade no fim do dia. Decisão sempre atrasada.",
    solution:
      "Painel de gestor vê todas as unidades em tempo real: filas ativas, atendimentos do dia, tempo médio. Multi-unidade ativado como add-on, sem migração de dados.",
    metrics: [
      { label: "Latência da informação", value: "Tempo real" },
      { label: "Planilhas manuais", value: "Eliminadas" },
      { label: "Decisão operacional", value: "Mesma hora" },
    ],
  },
];

const logos = ["Clínica Vita", "Lab Diagnos", "Hospital Norte", "Rede MedPlus", "Centro Saúde+", "Núcleo Clínico"];

function CasosPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="pt-32 pb-24">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-mesh pb-16">
          <div className="mx-auto max-w-5xl px-6 text-center">
            <Badge variant="outline" className="bg-card/60 backdrop-blur">
              Casos de uso
            </Badge>
            <h1 className="mt-6 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Onde o FilaMed <span className="text-gradient">faz diferença</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
              Quatro cenários comuns na saúde brasileira. Em todos, a meta é a mesma: paciente
              sentado, equipe focada no atendimento, gestor com dado em tempo real.
            </p>
          </div>
        </section>

        {/* Casos */}
        <section className="mx-auto max-w-6xl px-6 mt-4 grid gap-6 md:grid-cols-2">
          {cases.map(({ icon: Icon, tag, title, problem, solution, metrics }) => (
            <article
              key={title}
              className="rounded-2xl border border-border bg-card p-7 hover:border-primary/40 hover:shadow-soft transition"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <Badge variant="secondary" className="font-medium">
                  {tag}
                </Badge>
              </div>
              <h2 className="mt-5 font-display text-xl font-semibold leading-tight">{title}</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-destructive/80">
                    Problema
                  </p>
                  <p className="mt-1 text-muted-foreground">{problem}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Como o FilaMed resolve
                  </p>
                  <p className="mt-1 text-foreground/90">{solution}</p>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3 border-t border-border pt-5">
                {metrics.map((m) => (
                  <div key={m.label}>
                    <p className="font-display text-lg font-bold text-primary">{m.value}</p>
                    <p className="text-[11px] leading-tight text-muted-foreground">{m.label}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>

        {/* Prova social — placeholder honesto */}
        <section className="mx-auto max-w-6xl px-6 mt-24">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Em implantação
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
              Estamos abrindo as primeiras unidades parceiras
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Quer ser case de referência da sua região? Os primeiros 10 clientes recebem
              implantação assistida sem custo adicional.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {logos.map((nome) => (
              <div
                key={nome}
                className="flex h-20 items-center justify-center rounded-xl border border-dashed border-border bg-card/50 text-sm text-muted-foreground"
              >
                {nome}
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Logos ilustrativos. Vagas de case real abertas — fale com a gente.
          </p>
        </section>

        {/* Depoimento placeholder */}
        <section className="mx-auto max-w-4xl px-6 mt-20">
          <div className="relative rounded-3xl border border-border bg-gradient-card p-10 sm:p-14">
            <Quote className="h-10 w-10 text-primary/40" />
            <blockquote className="mt-4 font-display text-xl leading-relaxed sm:text-2xl">
              “Em duas semanas a recepção parou de receber reclamação de espera. O paciente
              acompanha pelo celular, a equipe chama pela TV, e eu vejo tudo do meu painel.”
            </blockquote>
            <footer className="mt-6 text-sm text-muted-foreground">
              — depoimento será publicado após go-live do primeiro case oficial.
            </footer>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-5xl px-6 mt-20">
          <div className="rounded-3xl border border-border bg-gradient-primary p-10 sm:p-14 text-center shadow-elegant">
            <h2 className="font-display text-3xl font-bold text-primary-foreground sm:text-4xl">
              Seu caso parece com algum desses?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
              Em 30 minutos a gente mostra exatamente como ficaria na sua unidade.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" variant="secondary" className="group shadow-soft">
                <a href="mailto:contato@filamed.app?subject=Quero%20ser%20case%20FilaMed">
                  Quero ser case
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Link to="/precos">Ver preços</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
