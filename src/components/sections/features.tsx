import {
  ListOrdered, QrCode, Tv, Megaphone, Volume2, Smartphone,
  ShieldCheck, BarChart3, Building2, Code2,
} from "lucide-react";

type Feature = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  bullets: string[];
};

const features: Feature[] = [
  {
    icon: ListOrdered,
    title: "Gestão Inteligente de Filas",
    desc: "Múltiplas filas simultâneas com priorização dinâmica e senhas alfanuméricas automáticas.",
    bullets: [
      "Consultas (CONS-001), Exames (EXM-001), Enfermagem (ENF-001)",
      "Urgência (URG-001), Farmácia (FAR-001), Laboratório (LAB-001)",
      "Prioridade por urgência, idade e tipo de atendimento",
      "Paciente em múltiplas filas simultâneas",
      "Atendimento por nome — sem senha física",
    ],
  },
  {
    icon: QrCode,
    title: "Entrada Inteligente na Fila",
    desc: "Quatro formas de entrada para qualquer perfil de paciente.",
    bullets: [
      "Recepção tradicional",
      "Quiosque de autoatendimento",
      "QR Code via celular",
      "WebApp sem instalação",
    ],
  },
  {
    icon: Tv,
    title: "Painel de Chamadas (TV)",
    desc: "Display sincronizado em tempo real para ambientes públicos.",
    bullets: [
      "Exibe senha, nome, destino e tempo estimado",
      "Suporte multi-TV totalmente sincronizado",
      "Atualização instantânea via WebSocket",
      "Design limpo, legível à distância",
    ],
  },
  {
    icon: Megaphone,
    title: "Sinalização Digital",
    desc: "Transforme a TV em um canal de comunicação institucional.",
    bullets: [
      "Conteúdo educativo, vídeos e campanhas",
      "Promoções e avisos contextuais",
      "Upload remoto e agendamento de conteúdo",
    ],
  },
  {
    icon: Volume2,
    title: "Voz e Notificações Multicanal",
    desc: "Chamadas automatizadas que alcançam o paciente onde ele estiver.",
    bullets: [
      'Voz: "Paciente [Nome], senha [Número], dirija-se para [Local]"',
      "WhatsApp, SMS e Telegram",
      "Alertas de proximidade, chamada e tempo estimado",
      "Controle remoto de volume por unidade",
    ],
  },
  {
    icon: Smartphone,
    title: "WebApp do Paciente",
    desc: "Acompanhamento da fila no celular, sem instalar app.",
    bullets: [
      "Posição atual em tempo real",
      "Tempo estimado dinâmico",
      "Notificações instantâneas",
      "PWA com modo offline",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Painel Administrativo",
    desc: "Controle total com perfis e permissões granulares.",
    bullets: [
      "Login seguro com JWT",
      "Perfis: Administrador, Recepcionista, Médico, Enfermeiro, Gestor",
      "Cadastro de pacientes e gestão de filas",
      "Ajuste de prioridades e remoção de pacientes",
      "Relatórios completos exportáveis",
    ],
  },
  {
    icon: BarChart3,
    title: "Analytics em Tempo Real",
    desc: "KPIs operacionais para decisões baseadas em dados.",
    bullets: [
      "Tempo médio de espera por fila",
      "Picos de demanda por horário/dia",
      "Eficiência por atendente e consultório",
      "Dashboards customizáveis",
    ],
  },
  {
    icon: Building2,
    title: "Gestão Multiunidade",
    desc: "Opere uma rede inteira a partir de um único painel.",
    bullets: [
      "Controle centralizado",
      "Configuração remota por unidade",
      "Personalização de fluxos por filial",
    ],
  },
  {
    icon: Code2,
    title: "Integrações e API",
    desc: "API REST completa + Webhooks em tempo real.",
    bullets: [
      "Prontuário Eletrônico, ERP e Agendamento",
      "Sistemas de BI e Analytics",
      "/api/pacientes · /api/filas · /api/chamadas",
      "/api/sincronizacao · /api/integracoes",
    ],
  },
];

export function Features() {
  return (
    <section id="funcionalidades" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center reveal">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Funcionalidades</span>
          <h2 className="mt-3 text-2xl font-bold sm:text-4xl">
            Tudo que sua unidade precisa, em uma plataforma só.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Cada módulo foi desenhado para resolver um gargalo real da operação de saúde.
          </p>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <article
              key={f.title}
              className="reveal group relative overflow-hidden rounded-2xl border border-border bg-gradient-card p-6 transition-all hover:-translate-y-1 hover:shadow-elegant hover:border-primary/30"
              style={{ transitionDelay: `${(i % 3) * 80}ms` }}
            >
              <div
                aria-hidden
                className="absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                style={{ background: "var(--gradient-primary)" }}
              />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-soft">
                <f.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="relative mt-5 font-display text-xl font-semibold">{f.title}</h3>
              <p className="relative mt-2 text-sm text-muted-foreground">{f.desc}</p>
              <ul className="relative mt-4 space-y-1.5">
                {f.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-foreground/80">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
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
