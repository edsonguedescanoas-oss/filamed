import {
  ListOrdered, QrCode, Tv, Megaphone, Volume2, Smartphone,
  ShieldCheck, BarChart3, Building2, Code2, LineChart, LayoutDashboard, CheckCircle2
} from "lucide-react";

type Feature = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  bullets: string[];
};

const features: Feature[] = [
  {
    icon: BarChart3,
    title: "Analytics Avançado",
    desc: "A inteligência que faltava para a sua tomada de decisão estratégica.",
    bullets: [
      "Tempo médio de espera por fila e médico",
      "Picos de demanda preditivos",
      "Relatórios de produtividade individual",
      "Dashboards customizáveis para gestores",
    ],
  },
  {
    icon: LayoutDashboard,
    title: "Painel de Controle Total",
    desc: "Visão 360º de todas as suas unidades em uma única tela.",
    bullets: [
      "Gestão de múltiplos consultórios e guichês",
      "Ajuste dinâmico de prioridades",
      "Monitoramento de SLAs em tempo real",
      "Controle de acesso granular por perfil",
    ],
  },
  {
    icon: ListOrdered,
    title: "Triagem Inteligente",
    desc: "Organização automática por gravidade e tipo de atendimento.",
    bullets: [
      "Priorização por protocolo de Manchester",
      "Múltiplas filas (Urgência, Exames, Consultas)",
      "Rechamadas automáticas inteligentes",
      "Integração nativa com triagem de enfermagem",
    ],
  },
  {
    icon: Tv,
    title: "Painel de Chamada (Smart TV)",
    desc: "Display de alta performance para ambientes de espera.",
    bullets: [
      "Chamada visual e sonora customizada",
      "Sinalização digital (TV Corporativa)",
      "Display de notícias e avisos institucionais",
      "Sincronização instantânea via WebSocket",
    ],
  },
  {
    icon: Volume2,
    title: "Chamada por Voz e Mobile",
    desc: "Comunicação multicanal para reduzir a ansiedade do paciente.",
    bullets: [
      "Voz humana sintetizada automatizada",
      "Notificações via WhatsApp e SMS",
      "WebApp do paciente (acompanha no celular)",
      "Alertas de proximidade automáticos",
    ],
  },
  {
    icon: Code2,
    title: "Integração Enterprise",
    desc: "Conecte o FilaMed ao seu ecossistema de software atual.",
    bullets: [
      "API REST completa para ERPs e HIS",
      "Webhooks para automações externas",
      "Segurança de dados (LGPD Compliant)",
      "SLA de 99.9% garantido em contrato",
    ],
  },
];

export function Features() {
  return (
    <section id="funcionalidades" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center reveal">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Funcionalidades</span>
          <h2 className="mt-4 text-3xl font-bold sm:text-5xl font-display">
            Tecnologia robusta desenhada <br /> para o <span className="text-gradient">sucesso da sua operação.</span>
          </h2>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Cada recurso foi desenvolvido ouvindo os maiores gestores de saúde do país. Menos operacional, mais estratégico.
          </p>
        </div>

        <div className="mt-20 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <article
              key={f.title}
              className="reveal group relative overflow-hidden rounded-3xl border border-border bg-gradient-card p-8 transition-all hover:-translate-y-2 hover:shadow-elegant hover:border-primary/30"
              style={{ transitionDelay: `${(i % 3) * 80}ms` }}
            >
              <div
                aria-hidden
                className="absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                style={{ background: "var(--gradient-primary)" }}
              />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-soft mb-8 group-hover:scale-110 transition-transform">
                <f.icon className="h-7 w-7 text-primary-foreground" />
              </div>
              <h3 className="relative font-display text-2xl font-semibold mb-4">{f.title}</h3>
              <p className="relative text-muted-foreground leading-relaxed mb-6">{f.desc}</p>
              <ul className="relative space-y-3">
                {f.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm text-foreground/80">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5 opacity-60" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
