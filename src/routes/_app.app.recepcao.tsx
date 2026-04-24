import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Ticket,
  Loader2,
  Printer,
  Share2,
   AlertCircle,
   UserPlus,
   Activity,
   Check,
} from "lucide-react";
import { TicketShareDialog } from "@/components/ticket-share-dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RoleGuard } from "@/components/role-guard";
import type { Database } from "@/integrations/supabase/types";

type Senha = Database["public"]["Tables"]["senhas"]["Row"];
type Prioridade = Database["public"]["Enums"]["senha_prioridade"];

export const Route = createFileRoute("/_app/app/recepcao")({
  head: () => ({ meta: [{ title: "Pré-atendimento — FilaMed" }] }),
  component: () => (
    <RoleGuard allow={["recepcao"]} path="/app/recepcao">
      <RecepcaoPage />
    </RoleGuard>
  ),
});

const onlyDigits = (v: string) => v.replace(/\D/g, "");

function maskTelefone(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

 type TriageCriterion = Database["public"]["Tables"]["triagem_criterios"]["Row"];
 
 const PRIO_RANK: Record<Prioridade, number> = { urgente: 3, preferencial: 2, normal: 1 };
 
function RecepcaoPage() {
  const { profile, hasAnyRole } = useAuth();
  const unidadeId = profile?.unidade_id;
  const canGerar = hasAnyRole(["admin", "recepcao", "super_admin"]);

  // Form pré-atendimento (3 campos)
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
   const [prioridade, setPrioridade] = useState<Prioridade>("normal");
   const [criterios, setCriterios] = useState<TriageCriterion[]>([]);
   const [selectedCriterios, setSelectedCriterios] = useState<string[]>([]);
   const [loadingCriterios, setLoadingCriterios] = useState(false);
  const [errors, setErrors] = useState<{ nome?: string; telefone?: string; data?: string }>({});

  const [emitting, setEmitting] = useState(false);
  const [autoImprimir, setAutoImprimir] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("recepcao_auto_imprimir");
    return saved !== null ? saved === "true" : false;
  });

  // Recentes
  const [recentes, setRecentes] = useState<
    (Senha & { paciente?: { nome_completo: string; telefone: string | null } | null })[]
  >([]);
  const [loadingRecentes, setLoadingRecentes] = useState(true);
  const [unidadeSlug, setUnidadeSlug] = useState<string | null>(null);

  // Compartilhamento
  const [shareOpen, setShareOpen] = useState(false);
  const [shareAutoPrint, setShareAutoPrint] = useState(false);
  const [shareData, setShareData] = useState<{
    senha: { id: string; codigo: string; token_publico: string };
    paciente: { nome_completo: string; telefone: string | null };
  } | null>(null);
  const [unidadeTicketConfig, setUnidadeTicketConfig] = useState<{
    logo_url: string | null;
    nome: string | null;
    rodape: string | null;
  } | null>(null);

  useEffect(() => {
    localStorage.setItem("recepcao_auto_imprimir", String(autoImprimir));
  }, [autoImprimir]);

  const fetchRecentes = async () => {
    if (!unidadeId) return;
    setLoadingRecentes(true);
    const { data, error } = await supabase
      .from("senhas")
      .select("*, paciente:pacientes(nome_completo, telefone), fila:filas(tipo)")
      .eq("unidade_id", unidadeId)
      .in("origem", ["pre_atendimento", "recepcao_guiche"])
      .order("created_at", { ascending: false })
      .limit(15);
    if (error) {
      toast.error("Erro ao carregar senhas: " + error.message);
    } else {
      setRecentes((data ?? []) as typeof recentes);
    }
    setLoadingRecentes(false);
  };

   const fetchCriterios = async () => {
     if (!unidadeId) return;
     setLoadingCriterios(true);
     const { data, error } = await supabase
       .from("triagem_criterios")
       .select("*")
       .eq("unidade_id", unidadeId)
       .eq("ativo", true)
       .order("ordem", { ascending: true });
     if (!error) setCriterios(data || []);
     setLoadingCriterios(false);
   };
 
  useEffect(() => {
    void fetchRecentes();
   void fetchCriterios();
    if (unidadeId) {
      void (async () => {
        const { data: u } = await supabase
          .from("unidades")
          .select("slug, nome, ticket_logo_url, ticket_unidade_nome, ticket_rodape")
          .eq("id", unidadeId)
          .maybeSingle();
        if (u) {
          setUnidadeSlug(u.slug ?? null);
          setUnidadeTicketConfig({
            logo_url: u.ticket_logo_url || null,
            nome: u.ticket_unidade_nome || u.nome || null,
            rodape: u.ticket_rodape || null,
          });
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidadeId]);

  useRealtimeTable({
    table: "senhas",
    filter: unidadeId ? `unidade_id=eq.${unidadeId}` : undefined,
    channelKey: `unidade:${unidadeId}:recepcao`,
    enabled: !!unidadeId,
    onChange: () => void fetchRecentes(),
  });

  const validate = () => {
    const next: { nome?: string; telefone?: string; data?: string } = {};
    if (nome.trim().length < 2) next.nome = "Informe o nome completo";
    const telDigits = onlyDigits(telefone);
    if (telDigits && telDigits.length < 10) next.telefone = "Telefone inválido";
    if (dataNascimento) {
      const d = new Date(dataNascimento);
      if (Number.isNaN(d.getTime()) || d > new Date()) next.data = "Data inválida";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

   const limpar = () => {
     setNome("");
     setTelefone("");
     setDataNascimento("");
     setPrioridade("normal");
     setSelectedCriterios([]);
     setErrors({});
   };
 
   const handleToggleCriterion = (id: string) => {
     setSelectedCriterios((prev) => {
       const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
       
       // Recalcular prioridade baseada nos critérios selecionados
       if (next.length === 0) {
         setPrioridade("normal");
       } else {
         const highestPrio = next.reduce((acc, currId) => {
           const c = criterios.find((x) => x.id === currId);
           if (!c) return acc;
           return PRIO_RANK[c.prioridade] > PRIO_RANK[acc] ? c.prioridade : acc;
         }, "normal" as Prioridade);
         setPrioridade(highestPrio);
       }
       
       return next;
     });
   };

  const handleGerar = async () => {
    if (!canGerar) {
      toast.error("Você não tem permissão para gerar senhas");
      return;
    }
    if (!unidadeId) return;
    if (!validate()) return;

    setEmitting(true);
    try {
       const { data, error } = await supabase.rpc("gerar_senha_guiche", {
         _unidade_id: unidadeId,
         _nome: nome.trim(),
         _telefone: onlyDigits(telefone) || undefined,
         _data_nascimento: dataNascimento || undefined,
         _prioridade: prioridade,
         _triagem_dados: selectedCriterios.length > 0 ? { criterios: selectedCriterios } : undefined,
       });
      if (error) throw error;
      const senha = (Array.isArray(data) ? data[0] : data) as unknown as Senha | null;
      if (!senha?.id || !senha.codigo || !senha.token_publico) {
        throw new Error("A senha foi gerada, mas o retorno veio incompleto. Atualize a tela e confira os recentes.");
      }
      toast.success(`Senha ${senha.codigo} gerada`, {
        description: `${nome.trim()} encaminhado(a) para o guichê`,
      });

      setShareData({
        senha: {
          id: senha.id,
          codigo: senha.codigo,
          token_publico: senha.token_publico,
        },
        paciente: {
          nome_completo: nome.trim(),
          telefone: onlyDigits(telefone) || null,
        },
      });
      setShareAutoPrint(autoImprimir);
      setShareOpen(true);

      limpar();
      void fetchRecentes();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao gerar senha";
      toast.error(msg);
    } finally {
      setEmitting(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      void handleGerar();
    }
  };

  return (
    <div className="mx-auto max-w-[1300px] px-6 py-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Pré-atendimento
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold">Recepção</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-xl">
            Capte os dados básicos do paciente e gere a senha do guichê. A
            classificação clínica (especialidade, tipo) é feita no guichê pela
            atendente que chamar.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2">
          <Printer className="h-4 w-4 text-primary" />
          <div>
            <Label htmlFor="auto-imprimir" className="text-xs cursor-pointer">
              Imprimir após gerar
            </Label>
          </div>
          <Switch id="auto-imprimir" checked={autoImprimir} onCheckedChange={setAutoImprimir} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]" onKeyDown={onKeyDown}>
        {/* Form pré-atendimento */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">Novo pré-atendimento</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rec-nome">Nome completo *</Label>
              <Input
                id="rec-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Maria da Silva"
                autoFocus
                className="h-11 text-base"
              />
              {errors.nome && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.nome}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rec-tel">Telefone</Label>
                <Input
                  id="rec-tel"
                  value={telefone}
                  onChange={(e) => setTelefone(maskTelefone(e.target.value))}
                  placeholder="(11) 98765-4321"
                  inputMode="numeric"
                  className="h-11 text-base"
                />
                {errors.telefone && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errors.telefone}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="rec-nasc">Data de nascimento</Label>
                <Input
                  id="rec-nasc"
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className="h-11 text-base"
                />
                {errors.data && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errors.data}
                  </p>
                )}
              </div>
            </div>

             <div className="space-y-3">
               <Label className="flex items-center justify-between">
                 <span>Classificação / Critérios</span>
                 {selectedCriterios.length > 0 && (
                   <Button 
                     variant="ghost" 
                     size="sm" 
                     className="h-6 text-[10px] text-muted-foreground uppercase"
                     onClick={() => {
                       setSelectedCriterios([]);
                       setPrioridade("normal");
                     }}
                   >
                     Limpar seleção
                   </Button>
                 )}
               </Label>
               
               {criterios.length > 0 ? (
                 <div className="flex flex-wrap gap-2">
                   {criterios.map((c) => {
                     const isSelected = selectedCriterios.includes(c.id);
                     return (
                       <Button
                         key={c.id}
                         type="button"
                         variant={isSelected ? "default" : "outline"}
                         size="sm"
                         className={cn(
                           "h-auto py-2 px-3 text-left flex flex-col items-start gap-1 transition-all",
                           isSelected && c.prioridade === "urgente" && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                           isSelected && c.prioridade === "preferencial" && "bg-amber-500 text-white hover:bg-amber-600",
                           isSelected && c.prioridade === "normal" && "bg-primary text-primary-foreground"
                         )}
                         onClick={() => handleToggleCriterion(c.id)}
                       >
                         <div className="flex items-center gap-2 w-full">
                           <span className="text-xs font-medium leading-tight flex-1">{c.nome}</span>
                           {isSelected && <Check className="h-3 w-3 shrink-0" />}
                         </div>
                         <span className={cn(
                           "text-[9px] uppercase tracking-wider opacity-80",
                           !isSelected && "text-muted-foreground"
                         )}>
                           {c.prioridade === "preferencial" ? "Prioritário" : c.prioridade}
                         </span>
                       </Button>
                     );
                   })}
                 </div>
               ) : (
                 <div className="space-y-2">
                   <Select value={prioridade} onValueChange={(v) => setPrioridade(v as Prioridade)}>
                     <SelectTrigger className="h-11">
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="normal">Normal</SelectItem>
                       <SelectItem value="preferencial">Prioritário (idoso, gestante…)</SelectItem>
                       <SelectItem value="urgente">Urgente</SelectItem>
                     </SelectContent>
                   </Select>
                   <p className="text-[10px] text-muted-foreground italic">
                     Dica: Configure critérios na aba "Triagem" para classificação automática.
                   </p>
                 </div>
               )}
             </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2 sm:justify-end">
              <Button variant="ghost" onClick={limpar} disabled={emitting}>
                Limpar
              </Button>
              <Button
                onClick={handleGerar}
                disabled={emitting || !canGerar}
                className="bg-gradient-primary h-11 px-6"
                size="lg"
              >
                {emitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Ticket className="h-4 w-4" />
                )}
                Gerar senha do guichê
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-right">
              Ctrl+Enter / ⌘+Enter para gerar
            </p>
          </div>
        </div>

        {/* Recentes */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
            <span className="font-display font-semibold flex items-center gap-2">
              <Ticket className="h-4 w-4 text-primary" /> Senhas recentes
            </span>
            <span className="text-xs text-muted-foreground">{recentes.length}</span>
          </div>
          {loadingRecentes ? (
            <div className="p-8 text-center">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : recentes.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma senha emitida ainda.
            </div>
          ) : (
            <ul className="divide-y divide-border max-h-[600px] overflow-y-auto">
              {recentes.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/20"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-lg font-bold tabular-nums">
                        {s.codigo}
                      </span>
                      <StatusBadge status={s.status} />
                    </div>
                    {s.paciente?.nome_completo && (
                      <div className="text-sm text-muted-foreground truncate">
                        {s.paciente.nome_completo}
                      </div>
                    )}
                  </div>
                  {unidadeSlug && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShareData({
                          senha: {
                            id: s.id,
                            codigo: s.codigo,
                            token_publico: s.token_publico,
                          },
                          paciente: {
                            nome_completo: s.paciente?.nome_completo ?? "",
                            telefone: s.paciente?.telefone ?? null,
                          },
                        });
                        setShareAutoPrint(false);
                        setShareOpen(true);
                      }}
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Dialog compartilhamento / impressão */}
      {shareData && (
        <TicketShareDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          autoPrint={shareAutoPrint}
          unidadeId={unidadeId ?? null}
          senha={shareData.senha}
          paciente={shareData.paciente}
          unidadeNome={unidadeTicketConfig?.nome ?? null}
          logoUrl={unidadeTicketConfig?.logo_url ?? null}
          rodape={unidadeTicketConfig?.rodape ?? null}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Senha["status"] }) {
  const map: Record<Senha["status"], { label: string; cls: string }> = {
    aguardando: { label: "Aguardando", cls: "bg-muted text-muted-foreground" },
    chamada: {
      label: "Chamada",
      cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40",
    },
    em_atendimento: { label: "Atendendo", cls: "bg-primary/15 text-primary" },
    finalizada: { label: "Finalizada", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
    ausente: { label: "Ausente", cls: "bg-destructive/15 text-destructive" },
    cancelada: { label: "Cancelada", cls: "bg-muted text-muted-foreground line-through" },
  };
  const { label, cls } = map[status];
  return (
    <Badge variant="outline" className={"text-[10px] uppercase " + cls}>
      {label}
    </Badge>
  );
}
