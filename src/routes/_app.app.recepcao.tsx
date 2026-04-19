import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Ticket,
  Loader2,
  Search,
  User as UserIcon,
  Sparkles,
  Copy,
  Check,
  X,
  AlertCircle,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Fila = Database["public"]["Tables"]["filas"]["Row"];
type Paciente = Database["public"]["Tables"]["pacientes"]["Row"];
type Senha = Database["public"]["Tables"]["senhas"]["Row"];
type Prioridade = Database["public"]["Enums"]["senha_prioridade"];

import { RoleGuard } from "@/components/role-guard";

export const Route = createFileRoute("/_app/app/recepcao")({
  head: () => ({ meta: [{ title: "Recepção — FilaMed" }] }),
  component: () => (
    <RoleGuard allow={["recepcao"]} path="/app/recepcao">
      <RecepcaoPage />
    </RoleGuard>
  ),
});

const PRIORIDADES: { value: Prioridade; label: string; ring: string; badge: string }[] = [
  {
    value: "normal",
    label: "Normal",
    ring: "ring-border",
    badge: "bg-muted text-foreground",
  },
  {
    value: "preferencial",
    label: "Preferencial",
    ring: "ring-amber-400",
    badge: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
  },
  {
    value: "urgente",
    label: "Urgente",
    ring: "ring-destructive",
    badge: "bg-destructive/15 text-destructive",
  },
];

const onlyDigits = (v: string) => v.replace(/\D/g, "");

function RecepcaoPage() {
  const { profile, hasAnyRole } = useAuth();
  const unidadeId = profile?.unidade_id;
  const canGerar = hasAnyRole(["admin", "recepcao"]);

  const [filas, setFilas] = useState<Fila[]>([]);
  const [loadingFilas, setLoadingFilas] = useState(true);
  const [filaId, setFilaId] = useState<string | null>(null);
  const [prioridade, setPrioridade] = useState<Prioridade>("normal");

  // paciente
  const [pacienteQuery, setPacienteQuery] = useState("");
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [searchingPac, setSearchingPac] = useState(false);
  const [pacienteSelecionado, setPacienteSelecionado] = useState<Paciente | null>(null);

  // emissão + lista
  const [emitting, setEmitting] = useState(false);
  const [recentes, setRecentes] = useState<(Senha & { paciente?: { nome_completo: string } | null })[]>([]);
  const [loadingRecentes, setLoadingRecentes] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // cadastro rápido de paciente
  const [novoOpen, setNovoOpen] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoCpf, setNovoCpf] = useState("");
  const [novoTelefone, setNovoTelefone] = useState("");
  const [savingNovo, setSavingNovo] = useState(false);

  const fetchFilas = async () => {
    if (!unidadeId) return;
    setLoadingFilas(true);
    const { data, error } = await supabase
      .from("filas")
      .select("*")
      .eq("unidade_id", unidadeId)
      .eq("ativa", true)
      .order("ordem", { ascending: true });
    if (error) {
      toast.error("Erro ao carregar filas: " + error.message);
    } else {
      setFilas(data ?? []);
      if (data && data.length > 0 && !filaId) setFilaId(data[0].id);
    }
    setLoadingFilas(false);
  };

  const fetchRecentes = async () => {
    if (!unidadeId) return;
    setLoadingRecentes(true);
    const { data, error } = await supabase
      .from("senhas")
      .select("*, paciente:pacientes(nome_completo)")
      .eq("unidade_id", unidadeId)
      .order("created_at", { ascending: false })
      .limit(15);
    if (error) {
      toast.error("Erro ao carregar senhas: " + error.message);
    } else {
      setRecentes((data ?? []) as typeof recentes);
    }
    setLoadingRecentes(false);
  };

  useEffect(() => {
    void fetchFilas();
    void fetchRecentes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidadeId]);

  // realtime nas senhas via hook compartilhado
  useRealtimeTable({
    table: "senhas",
    filter: unidadeId ? `unidade_id=eq.${unidadeId}` : undefined,
    enabled: !!unidadeId,
    onChange: () => void fetchRecentes(),
  });

  // busca de pacientes (debounced)
  useEffect(() => {
    if (!unidadeId) return;
    const q = pacienteQuery.trim();
    if (q.length < 2) {
      setPacientes([]);
      return;
    }
    setSearchingPac(true);
    const timer = setTimeout(async () => {
      const qDigits = onlyDigits(q);
      let query = supabase
        .from("pacientes")
        .select("*")
        .eq("unidade_id", unidadeId)
        .limit(8);
      if (qDigits.length >= 3) {
        query = query.or(`nome_completo.ilike.%${q}%,cpf.like.%${qDigits}%`);
      } else {
        query = query.ilike("nome_completo", `%${q}%`);
      }
      const { data } = await query.order("nome_completo");
      setPacientes(data ?? []);
      setSearchingPac(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [pacienteQuery, unidadeId]);

  const filaSelecionada = useMemo(
    () => filas.find((f) => f.id === filaId) ?? null,
    [filas, filaId],
  );

  const proximaSenhaPreview = filaSelecionada
    ? `${filaSelecionada.prefixo_senha}${String(filaSelecionada.contador_senha + 1).padStart(3, "0")}`
    : null;

  const handleGerar = async () => {
    if (!filaId || !canGerar) return;
    if (!pacienteSelecionado) {
      toast.error("Selecione ou cadastre um paciente para gerar a senha");
      return;
    }
    setEmitting(true);
    try {
      const { data, error } = await supabase.rpc("gerar_senha", {
        _fila_id: filaId,
        _prioridade: prioridade,
        _paciente_id: pacienteSelecionado.id,
        _origem: "recepcao",
      });
      if (error) throw error;
      const senha = data as unknown as Senha;
      toast.success(`Senha ${senha.codigo} emitida`, {
        description: `Vinculada a ${pacienteSelecionado.nome_completo}`,
      });
      // limpa paciente, mantém fila/prioridade para próximo atendimento
      setPacienteSelecionado(null);
      setPacienteQuery("");
      setPrioridade("normal");
      // refresh fila para atualizar contador exibido
      void fetchFilas();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao gerar senha";
      toast.error(msg);
    } finally {
      setEmitting(false);
    }
  };

  const handleSalvarNovoPaciente = async () => {
    if (!unidadeId) return;
    const nome = novoNome.trim();
    if (nome.length < 2) {
      toast.error("Informe o nome completo do paciente");
      return;
    }
    setSavingNovo(true);
    try {
      const { data, error } = await supabase
        .from("pacientes")
        .insert({
          unidade_id: unidadeId,
          nome_completo: nome,
          cpf: onlyDigits(novoCpf) || null,
          telefone: onlyDigits(novoTelefone) || null,
        })
        .select("*")
        .single();
      if (error) throw error;
      setPacienteSelecionado(data as Paciente);
      setPacienteQuery("");
      setPacientes([]);
      setNovoOpen(false);
      setNovoNome("");
      setNovoCpf("");
      setNovoTelefone("");
      toast.success("Paciente cadastrado", { description: nome });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao cadastrar paciente";
      toast.error(msg);
    } finally {
      setSavingNovo(false);
    }
  };

  const copyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedToken(token);
      toast.success("Token copiado");
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      toast.error("Falha ao copiar");
    }
  };

  if (!canGerar) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-4 font-display text-2xl font-bold">Acesso restrito</h1>
        <p className="mt-2 text-muted-foreground">
          Apenas administradores e recepção podem emitir senhas.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Operação
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold">Recepção</h1>
        <p className="mt-1 text-muted-foreground">
          Emita senhas em tempo real e acompanhe as últimas geradas.
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* ─────── FORM ─────── */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="font-display text-lg font-semibold">Nova senha</h2>

          {/* fila */}
          <div className="mt-5">
            <Label className="mb-2 block">Fila</Label>
            {loadingFilas ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filas.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                Nenhuma fila ativa. Cadastre uma em{" "}
                <a href="/app/filas" className="text-primary underline">
                  Filas
                </a>
                .
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {filas.map((fila) => {
                  const active = fila.id === filaId;
                  return (
                    <button
                      key={fila.id}
                      type="button"
                      onClick={() => setFilaId(fila.id)}
                      className={cn(
                        "group flex flex-col items-start rounded-xl border-2 p-3 text-left transition-all",
                        active
                          ? "border-primary bg-primary/5 shadow-soft"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-7 w-7 rounded-md flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: fila.cor ?? "#3B82F6" }}
                        >
                          {fila.prefixo_senha}
                        </div>
                        <span className="text-sm font-medium truncate">{fila.nome}</span>
                      </div>
                      <span className="mt-1 text-xs text-muted-foreground capitalize">
                        {fila.tipo}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* prioridade */}
          <div className="mt-5">
            <Label className="mb-2 block">Prioridade</Label>
            <div className="grid grid-cols-3 gap-2">
              {PRIORIDADES.map((p) => {
                const active = p.value === prioridade;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPrioridade(p.value)}
                    className={cn(
                      "rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-all",
                      active
                        ? `border-primary bg-primary/5 ring-2 ring-offset-2 ring-offset-background ${p.ring}`
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* paciente (obrigatório) */}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <Label>
                Paciente <span className="text-destructive">*</span>
              </Label>
              <button
                type="button"
                onClick={() => {
                  setNovoNome(pacienteQuery.trim());
                  setNovoOpen(true);
                }}
                className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
              >
                <UserPlus className="h-3.5 w-3.5" /> Novo paciente
              </button>
            </div>
            {pacienteSelecionado ? (
              <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
                  <UserIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{pacienteSelecionado.nome_completo}</p>
                  {pacienteSelecionado.cpf && (
                    <p className="text-xs text-muted-foreground font-mono">
                      CPF {pacienteSelecionado.cpf}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setPacienteSelecionado(null);
                    setPacienteQuery("");
                  }}
                  aria-label="Remover paciente"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={pacienteQuery}
                  onChange={(e) => setPacienteQuery(e.target.value)}
                  placeholder="Buscar por nome ou CPF…"
                  className="pl-9"
                />
                {pacienteQuery.trim().length >= 2 && (
                  <div className="absolute z-10 mt-1 w-full rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
                    {searchingPac ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : pacientes.length === 0 ? (
                      <div className="p-3 text-sm text-center space-y-2">
                        <p className="text-muted-foreground">Nenhum paciente encontrado.</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setNovoNome(pacienteQuery.trim());
                            setNovoOpen(true);
                          }}
                        >
                          <UserPlus className="h-4 w-4" />
                          Cadastrar “{pacienteQuery.trim()}”
                        </Button>
                      </div>
                    ) : (
                      <ul className="max-h-64 overflow-y-auto">
                        {pacientes.map((p) => (
                          <li key={p.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setPacienteSelecionado(p);
                                setPacienteQuery("");
                                setPacientes([]);
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors"
                            >
                              <UserIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {p.nome_completo}
                                </p>
                                {p.cpf && (
                                  <p className="text-xs text-muted-foreground font-mono">
                                    {p.cpf}
                                  </p>
                                )}
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* preview + botão */}
          {filaSelecionada && (
            <div className="mt-6 rounded-xl bg-muted/40 p-4 flex items-center gap-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-xl text-white font-display font-bold text-lg shadow-soft"
                style={{ backgroundColor: filaSelecionada.cor ?? "#3B82F6" }}
              >
                {proximaSenhaPreview?.slice(0, filaSelecionada.prefixo_senha.length)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Próxima senha</p>
                <p className="font-display text-2xl font-bold font-mono">{proximaSenhaPreview}</p>
              </div>
              <Badge variant="outline" className="capitalize">
                {prioridade}
              </Badge>
            </div>
          )}

          <Button
            onClick={handleGerar}
            disabled={!filaId || emitting || filas.length === 0 || !pacienteSelecionado}
            className="mt-5 w-full bg-gradient-primary shadow-soft text-base h-12"
            size="lg"
          >
            {emitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Emitir senha
              </>
            )}
          </Button>
          {!pacienteSelecionado && (
            <p className="mt-2 text-xs text-muted-foreground text-center">
              Selecione ou cadastre um paciente para emitir a senha.
            </p>
          )}
        </section>

        {/* ─────── RECENTES ─────── */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Últimas senhas</h2>
            <Badge variant="outline" className="font-mono text-xs">
              tempo real
            </Badge>
          </div>

          {loadingRecentes ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : recentes.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-12 text-center">
              <Ticket className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Nenhuma senha emitida ainda. Crie a primeira ao lado.
              </p>
            </div>
          ) : (
            <ul className="mt-4 space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {recentes.map((s) => {
                const fila = filas.find((f) => f.id === s.fila_id);
                const prio = PRIORIDADES.find((p) => p.value === s.prioridade)!;
                return (
                  <li
                    key={s.id}
                    className="group flex items-center gap-3 rounded-xl border border-border p-3 hover:border-primary/40 transition-colors"
                  >
                    <div
                      className="flex h-12 w-14 shrink-0 items-center justify-center rounded-lg text-white font-display font-bold text-sm shadow-soft"
                      style={{ backgroundColor: fila?.cor ?? "#3B82F6" }}
                    >
                      {s.codigo}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">
                          {fila?.nome ?? "Fila removida"}
                        </span>
                        <Badge className={cn("text-[10px] uppercase", prio.badge)}>
                          {prio.label}
                        </Badge>
                        {s.status !== "aguardando" && (
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {s.status}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {s.paciente?.nome_completo ?? "Sem paciente"} ·{" "}
                        {format(new Date(s.created_at), "HH:mm:ss", { locale: ptBR })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void copyToken(s.token_publico)}
                      aria-label="Copiar token público"
                      title="Copiar token público (link do paciente)"
                    >
                      {copiedToken === s.token_publico ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Dialog de cadastro rápido de paciente */}
      <Dialog open={novoOpen} onOpenChange={setNovoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo paciente</DialogTitle>
            <DialogDescription>
              Cadastre rapidamente para vincular à senha. Outros dados podem ser completados depois em Pacientes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="novo-nome" className="mb-1.5 block">
                Nome completo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="novo-nome"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Ex: Maria da Silva"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="novo-cpf" className="mb-1.5 block">CPF</Label>
                <Input
                  id="novo-cpf"
                  value={novoCpf}
                  onChange={(e) => setNovoCpf(e.target.value)}
                  placeholder="Opcional"
                  inputMode="numeric"
                />
              </div>
              <div>
                <Label htmlFor="novo-tel" className="mb-1.5 block">Telefone</Label>
                <Input
                  id="novo-tel"
                  value={novoTelefone}
                  onChange={(e) => setNovoTelefone(e.target.value)}
                  placeholder="Opcional"
                  inputMode="tel"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoOpen(false)} disabled={savingNovo}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSalvarNovoPaciente()} disabled={savingNovo}>
              {savingNovo ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Cadastrar e usar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
