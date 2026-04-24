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
      "A maioria das clínicas observa uma redução de 15% a 25% no tempo médio de espera e abandono já no primeiro mês. Com a otimização da equipe e redução de ociosidade, o payback do investimento ocorre geralmente entre 3 a 6 meses através da recuperação de pacientes que antes desistiam do atendimento.",
  },
  {
    question: "Como funciona o processo de implantação?",
    answer:
      "Nossa implantação é rápida e guiada. Em até 48 horas sua clínica já pode estar operando com o sistema. Oferecemos treinamento remoto para sua equipe e suporte dedicado durante toda a fase de transição, sem necessidade de obras ou infraestrutura complexa.",
  },
  {
    question: "O FilaMed se integra com o meu sistema atual (HIS/ERP)?",
    answer:
      "Sim, o FilaMed possui API aberta e integra-se com os principais sistemas de gestão hospitalar (HIS) do mercado. Suportamos integrações via HL7, Webhooks, JSON ou consulta direta a bancos de dados, garantindo que os dados dos pacientes fluam sem necessidade de redigitação.",
  },
  {
    question: "Como é garantida a privacidade e conformidade com a LGPD?",
    answer:
      "Seguimos rigorosamente a LGPD. Todos os dados são criptografados em repouso e em trânsito. Utilizamos infraestrutura de alta disponibilidade (AWS) e mantemos logs de auditoria completos. Além disso, oferecemos termos de confidencialidade e segurança para garantir a proteção jurídica total da sua unidade de saúde.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="py-24 sm:py-32 bg-slate-50/50">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center mb-16 reveal">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary mb-4">
            <HelpCircle className="h-4 w-4" />
            Dúvidas Frequentes
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl font-display">
            Respostas para <span className="text-primary italic">gestores</span>
          </h2>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Tudo o que você precisa saber sobre a implementação estratégica do FilaMed na sua unidade.
          </p>
        </div>

        <div className="mx-auto max-w-3xl reveal">
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqData.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-white border border-slate-200 rounded-2xl px-6 py-2 shadow-sm hover:shadow-md transition-all duration-300 data-[state=open]:border-primary/30"
              >
                <AccordionTrigger className="text-left font-semibold text-lg hover:no-underline text-foreground py-4">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
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
