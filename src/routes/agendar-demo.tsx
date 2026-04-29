import { createFileRoute } from "@tanstack/react-router";
import Scheduler from "@/components/Operacao/Agendamento/Scheduler";
import { Building2, ShieldCheck, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/agendar-demo")({
  component: () => <PublicSchedulingPage />,
});

function PublicSchedulingPage() {
  // Em uma aplicação real, o leadId viria de um parâmetro de URL ou token
  const leadId = new URLSearchParams(window.location.search).get('lead') || '39f5c4a5-926d-4952-b91c-8b8398188172';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header Minimalista */}
      <header className="bg-white border-b py-4 px-6 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-primary h-8 w-8 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-xl italic">F</span>
          </div>
          <span className="font-black text-xl tracking-tighter">FILAMED</span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 font-medium">
            <ShieldCheck className="h-3 w-3 text-green-500" /> Site Seguro
          </span>
          <span className="flex items-center gap-1 font-medium">
            <CheckCircle2 className="h-3 w-3 text-green-500" /> Parceiro Credenciado
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-6xl">
          <Scheduler leadId={leadId} />
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 text-center text-muted-foreground border-t bg-white">
        <div className="flex items-center justify-center gap-2 mb-2 text-sm">
          <Building2 className="h-4 w-4" />
          <span className="font-semibold">FilaMed - Tecnologia em Saúde</span>
        </div>
        <p className="text-[10px] uppercase tracking-widest font-bold">
          © 2026 Filamed SaaS Operações S.A.
        </p>
      </footer>
    </div>
  );
}
