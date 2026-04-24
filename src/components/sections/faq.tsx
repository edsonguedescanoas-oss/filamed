import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const faqData = [
  {
    question: "Qual o ROI (Retorno sobre Investimento) esperado?",
    answer:
      "A maioria das clínicas observa uma redução de 15% a 25% no tempo médio de espera e abandono já no primeiro mês. Com a otimização da equipe e redução de ociosidade, o payback do investimento ocorre geralmente entre 3 a 6 meses através da recuperação de pacientes que antes desistiam do atendimento por conta do caos na recepção.",
  },
  {
    question: "Como funciona o processo de implantação?",
    answer:
      "Nossa implantação é rápida e totalmente guiada pela nossa equipe de Customer Success. Em até 48 horas sua clínica já pode estar operando com o sistema. Oferecemos treinamento remoto completo para sua equipe e suporte dedicado durante toda a fase de transição, sem necessidade de obras ou infraestrutura complexa.",
  },
  {
    question: "O FilaMed se integra com o meu sistema atual (HIS/ERP)?",
    answer:
      "Sim, o FilaMed foi construído com foco em interoperabilidade. Possuímos API aberta e nos integramos com os principais sistemas de gestão hospitalar (HIS) do mercado. Suportamos integrações via HL7, Webhooks, JSON ou consulta direta a bancos de dados, garantindo que os dados dos pacientes fluam sem necessidade de redigitação.",
  },
  {
    question: "Como é garantida a privacidade e conformidade com a LGPD?",
    answer:
      "Seguimos rigorosamente a LGPD. Todos os dados são criptografados em repouso e em trânsito com protocolos TLS 1.3. Utilizamos infraestrutura de alta disponibilidade (AWS) e mantemos logs de auditoria completos. Além disso, oferecemos termos de confidencialidade e segurança para garantir a proteção jurídica total da sua unidade de saúde e dos dados sensíveis dos pacientes.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="relative py-24 sm:py-32 bg-slate-50/50 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      <div className="mx-auto max-w-7xl px-6 relative">
        <div className="mx-auto max-w-2xl text-center mb-16 reveal">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Transparência</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl font-display">
            Respostas para <span className="text-primary italic">gestores</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Tudo o que você precisa saber antes de levar a inteligência do FilaMed para sua unidade.
          </p>
        </div>

        <div className="mx-auto max-w-3xl reveal">
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqData.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="group border border-slate-200 bg-white rounded-3xl px-8 py-2 shadow-sm transition-all duration-300 data-[state=open]:border-primary/30 data-[state=open]:shadow-elegant hover:border-primary/20"
              >
                <AccordionTrigger className="text-left font-display font-semibold text-xl hover:no-underline text-foreground py-5">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-lg leading-relaxed pb-8 border-t border-slate-50 pt-4">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
