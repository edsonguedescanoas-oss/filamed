import { ShieldCheck, Lock, UserCheck, History, CheckCircle2 } from "lucide-react";

const securityFeatures = [
  {
    icon: ShieldCheck,
    title: "Conformidade LGPD",
    desc: "Processamento ético e seguro de dados sensíveis de saúde.",
    bullets: [
      "Adequação total à Lei Geral de Proteção de Dados",
      "Termos de consentimento integrados",
      "Anonimização de dados para relatórios",
      "Direito ao esquecimento simplificado"
    ],
  },
  {
    icon: Lock,
    title: "Criptografia Avançada",
    desc: "Sua base de dados protegida pelos padrões mais rigorosos do mercado.",
    bullets: [
      "Dados criptografados em repouso (AES-256)",
      "Comunicação via SSL/TLS de alta segurança",
      "Backups diários criptografados",
      "Proteção contra ataques DDoS e SQL Injection"
    ],
  },
  {
    icon: UserCheck,
    title: "Gestão de Permissões",
    desc: "Controle total sobre quem acessa o quê na sua operação.",
    bullets: [
      "Níveis de acesso por perfil (RBAC)",
      "Autenticação de dois fatores (2FA)",
      "Vinculação por unidade e setor",
      "Bloqueio automático de sessões inativas"
    ],
  },
  {
    icon: History,
    title: "Auditoria e Retenção",
    desc: "Rastreabilidade completa para segurança jurídica e operacional.",
    bullets: [
      "Logs detalhados de todas as operações",
      "Histórico de alterações de registros",
      "Políticas customizáveis de retenção",
      "Exportação de trilhas de auditoria"
    ],
  },
];

export function Security() {
  return (
    <section id="seguranca" className="relative py-24 sm:py-32 bg-secondary/30">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center reveal">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Segurança & Confiança</span>
          <h2 className="mt-4 text-3xl font-bold sm:text-5xl font-display">
            Sua operação blindada com o <br /><span className="text-gradient">máximo rigor de segurança.</span>
          </h2>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Entendemos que dados de saúde são ativos críticos. Por isso, a segurança não é um recurso, é o nosso alicerce.
          </p>
        </div>

        <div className="mt-20 grid gap-8 md:grid-cols-2">
          {securityFeatures.map((f, i) => (
            <article
              key={f.title}
              className="reveal group relative overflow-hidden rounded-3xl border border-border bg-background p-8 transition-all hover:-translate-y-2 hover:shadow-elegant hover:border-primary/30"
              style={{ transitionDelay: `${(i % 2) * 80}ms` }}
            >
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary shadow-soft group-hover:scale-110 transition-transform">
                  <f.icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-display text-2xl font-semibold mb-3">{f.title}</h3>
                  <p className="text-muted-foreground leading-relaxed mb-6">{f.desc}</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                    {f.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-3 text-sm text-foreground/80">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5 opacity-60" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
