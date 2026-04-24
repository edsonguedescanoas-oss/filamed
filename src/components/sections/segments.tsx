import { Stethoscope, Activity, Sparkles, Building2, Users, LayoutList } from "lucide-react";

const segments = [
  {
    icon: Stethoscope,
    title: "Clínicas Médicas",
    description: "Gestão completa para consultórios de todas as especialidades, garantindo agilidade no atendimento.",
  },
  {
    icon: Activity,
    title: "Clínicas Odontológicas",
    description: "Organização eficiente para fluxos de pacientes e procedimentos odontológicos.",
  },
  {
    icon: Sparkles,
    title: "Clínicas Estéticas",
    description: "Experiência premium para clientes que buscam excelência e pontualidade.",
  },
  {
    icon: Building2,
    title: "Negócios com Fluxo",
    description: "Ideal para qualquer estabelecimento que necessite organizar processos de atendimento e filas.",
  },
];

export function Segments() {
  return (
    <section className="relative py-24 sm:py-32 bg-card overflow-hidden">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center reveal">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Para quem é o FilaMed</span>
          <h2 className="mt-3 text-3xl font-bold sm:text-5xl font-display">
            A solução versátil para <span className="text-gradient">diversos segmentos.</span>
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            O FilaMed foi projetado para se adaptar a qualquer negócio que preze pela organização e pela experiência do cliente no atendimento presencial.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {segments.map((segment, i) => (
            <div
              key={segment.title}
              className="reveal group relative p-8 rounded-3xl border border-border bg-background transition-all hover:-translate-y-1 hover:shadow-elegant hover:border-primary/20"
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6 group-hover:scale-110 transition-transform">
                <segment.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-xl font-bold mb-3">{segment.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {segment.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 p-8 rounded-[2rem] border border-primary/10 bg-primary/5 flex flex-col md:flex-row items-center gap-8 reveal">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-primary">
            <LayoutList className="h-8 w-8" />
          </div>
          <div>
            <h4 className="text-xl font-bold mb-2">Processos e Filas que precisam de organização?</h4>
            <p className="text-muted-foreground">
              Se o seu negócio tem atendimento presencial e você quer eliminar a desorganização, o FilaMed é a ferramenta certa para transformar sua produtividade.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
