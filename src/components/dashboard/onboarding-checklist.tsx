import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ArrowRight, X, ListChecks, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type Step = {
  id: string;
  title: string;
  desc: string;
  to: "/app/conta" | "/app/filas" | "/app/recepcao" | "/app/voz" | "/app/notificacoes" | "/tv";
  done: boolean;
};

const STORAGE_KEY = (unidadeId: string) => `filamed:onboarding:${unidadeId}:dismissed`;

interface Props {
  unidadeId: string;
  unidadeSlug?: string | null;
}

/**
 * Tour guiado pra novo admin: detecta se a unidade já tem fila, senha,
 * configurou voz e abriu a TV. Some quando completo ou quando o usuário
 * dispensa explicitamente. Cada item leva pra rota onde se executa a ação.
 */
export function OnboardingChecklist({ unidadeId, unidadeSlug }: Props) {
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY(unidadeId)) === "1";
  });

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const [unidadeRes, filasRes, senhasRes, vozRes, notificacoesRes] = await Promise.all([
        supabase.from("unidades").select("telefone, endereco, whatsapp_config, google_review_url").eq("id", unidadeId).maybeSingle(),
        supabase.from("filas").select("id", { head: true, count: "exact" }).eq("unidade_id", unidadeId),
        supabase.from("senhas").select("id", { head: true, count: "exact" }).eq("unidade_id", unidadeId),
        supabase.from("unidade_voice_config").select("id", { head: true, count: "exact" }).eq("unidade_id", unidadeId),
        supabase.from("notificacoes_log").select("id", { head: true, count: "exact" }).eq("unidade_id", unidadeId),
      ]);
      if (cancelled) return;

      const unidade = unidadeRes.data;
      const whatsappConfig = (unidade?.whatsapp_config ?? {}) as {
        api_url?: string;
        api_key?: string;
        instance_id?: string;
        template_chamada?: string;
        template_finalizacao?: string;
      };
      const unidadeConfigurada = Boolean(unidade?.telefone || unidade?.endereco);
      const notificacoesConfiguradas = Boolean(
        whatsappConfig.api_url && whatsappConfig.api_key && whatsappConfig.instance_id,
      );

      const next: Step[] = [
        {
          id: "unidade",
          title: "Complete os dados da unidade",
          desc: "Nome público, telefone, endereço e dados exibidos nos comprovantes.",
          to: "/app/conta",
          done: unidadeConfigurada,
        },
        {
          id: "fila",
          title: "Crie as filas de atendimento",
          desc: "Separe recepção, consultas, exames e prioridades por prefixo.",
          to: "/app/filas",
          done: (filasRes.count ?? 0) > 0,
        },
        {
          id: "notificacoes",
          title: "Configure os canais de notificação",
          desc: "Conecte WhatsApp, mensagem final e link de avaliação no Google.",
          to: "/app/notificacoes",
          done: notificacoesConfiguradas,
        },
        {
          id: "voz",
          title: "Configure a voz da chamada",
          desc: "Escolha provedor e timbre. Browser TTS funciona de cara.",
          to: "/app/voz",
          done: (vozRes.count ?? 0) > 0,
        },
        {
          id: "teste",
          title: "Faça um teste de ponta a ponta",
          desc: "Gere uma senha, aceite no guichê e confirme as notificações.",
          to: "/app/recepcao",
          done: (senhasRes.count ?? 0) > 0 && (notificacoesRes.count ?? 0) > 0,
        },
      ];
      setSteps(next);
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, [unidadeId]);

  if (dismissed || !steps) return null;
  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  if (completed === total) return null;

  function dismiss() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY(unidadeId), "1");
    }
    setDismissed(true);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-card p-6 sm:p-7 shadow-soft">
      <div
        aria-hidden
        className="absolute -top-16 -right-16 h-48 w-48 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--gradient-primary)" }}
      />
      <button
        onClick={dismiss}
        aria-label="Dispensar checklist"
        className="absolute top-3 right-3 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-soft">
            <ListChecks className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Comece por aqui
            </p>
            <h3 className="font-display text-lg font-semibold leading-tight">
              {completed === 0
                ? "Bora colocar sua unidade no ar"
                : `Faltam ${total - completed} passos pra ir ao ar`}
            </h3>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Progress value={(completed / total) * 100} className="h-2" />
          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            {completed}/{total}
          </span>
        </div>

        <ul className="mt-5 space-y-2.5">
          {steps.map((s) => (
            <li
              key={s.id}
              className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                s.done
                  ? "border-success/30 bg-success/5"
                  : "border-border bg-background/40 hover:border-primary/40"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  s.done
                    ? "bg-success text-success-foreground"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {s.done ? <Check className="h-4 w-4" strokeWidth={3} /> : <Sparkles className="h-3.5 w-3.5" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${s.done ? "line-through text-muted-foreground" : ""}`}>
                  {s.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">{s.desc}</p>
              </div>
              {!s.done && (
                <Button asChild size="sm" variant="ghost" className="shrink-0 group">
                  {s.to === "/tv" && unidadeSlug ? (
                    <Link to="/tv/$slug" params={{ slug: unidadeSlug }}>
                      Ir
                      <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  ) : (
                    <Link to={s.to === "/tv" ? "/app/filas" : s.to}>
                      Ir
                      <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  )}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
