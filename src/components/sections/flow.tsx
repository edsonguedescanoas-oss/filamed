import { LogIn, Hash, BellRing, Megaphone, Stethoscope, LineChart } from "lucide-react";

const steps = [
  { icon: LogIn, title: "Entrada do paciente", text: "Recepção, QR Code, totem ou WebApp — escolha do paciente." },
  { icon: Hash, title: "Senha ou cadastro por nome", text: "Sistema gera senha alfanumérica ou registra por nome." },
  { icon: BellRing, title: "Acompanhamento no celular", text: "Posição e tempo estimado em tempo real." },
  { icon: Megaphone, title: "Chamada automática", text: "TV + voz + notificação multicanal simultâneas." },
  { icon: Stethoscope, title: "Atendimento realizado", text: "Profissional executa com toda informação à mão." },
  { icon: LineChart, title: "Dados e analytics", text: "Sistema registra tudo e gera insights operacionais." },
];

export function Flow() {
  return (
    <section id="fluxo" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center reveal">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Como Funciona</span>
          <h2 className="mt-3 text-3xl font-bold sm:text-5xl">
            Da chegada ao atendimento, sem fricção.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Seis etapas automatizadas que substituem dezenas de processos manuais.
          </p>
        </div>

        <div className="relative mt-16">
          <div
            aria-hidden
            className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-primary/30 to-transparent lg:block"
          />
          <ol className="grid gap-6 lg:grid-cols-2">
            {steps.map((s, i) => (
              <li
                key={s.title}
                className={`reveal relative rounded-2xl border border-border bg-gradient-card p-6 shadow-soft transition-transform hover:-translate-y-1 ${
                  i % 2 === 1 ? "lg:translate-y-12" : ""
                }`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
                    <s.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div className="font-display text-5xl font-bold text-gradient leading-none">
                    0{i + 1}
                  </div>
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
