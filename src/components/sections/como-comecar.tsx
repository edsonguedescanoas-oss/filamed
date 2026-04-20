import { UserPlus, ListOrdered, MonitorPlay, Rocket } from "lucide-react";

const steps = [
  {
    n: "01",
    icon: UserPlus,
    title: "Cadastro da unidade",
    desc: "5 minutos. Nome, CNPJ e o primeiro admin. Pronto para configurar.",
    time: "5 min",
  },
  {
    n: "02",
    icon: ListOrdered,
    title: "Crie suas filas",
    desc: "Consulta, exame, coleta — quantas precisar. Prefixo de senha e cor de cada uma.",
    time: "10 min",
  },
  {
    n: "03",
    icon: MonitorPlay,
    title: "Abra a TV",
    desc: "Cole a URL pública em qualquer Smart TV ou navegador. Sem instalar nada.",
    time: "2 min",
  },
  {
    n: "04",
    icon: Rocket,
    title: "Vá ao ar",
    desc: "Recepção emite a primeira senha, paciente acompanha pelo QR Code. Você está rodando.",
    time: "Mesmo dia",
  },
];

export function ComoComecar() {
  return (
    <section id="como-comecar" className="relative py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Implantação rápida
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold leading-tight sm:text-5xl">
            Do zero ao ar <span className="text-gradient">em 1 dia</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Sem instalação, sem hardware, sem migração. Quatro passos e a fila virou tempo real.
          </p>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ n, icon: Icon, title, desc, time }, i) => (
            <div
              key={n}
              className="relative rounded-2xl border border-border bg-card p-6 hover:border-primary/40 hover:shadow-soft transition"
            >
              <span className="font-display text-5xl font-bold text-primary/15 absolute top-3 right-4 leading-none">
                {n}
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-soft">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
              <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
                {time}
              </div>
              {i < steps.length - 1 && (
                <div
                  aria-hidden
                  className="hidden lg:block absolute top-1/2 -right-3 h-px w-6 bg-gradient-to-r from-primary/40 to-transparent"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
