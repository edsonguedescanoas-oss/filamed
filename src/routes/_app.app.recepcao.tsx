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
  Tv,
  Trash2,
  MessageSquare,
  Share2,
  Printer,
} from "lucide-react";
import { TicketShareDialog } from "@/components/ticket-share-dialog";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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

function maskCPF(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function isValidCPF(cpf: string): boolean {
  const d = onlyDigits(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(d[i], 10) * (10 - i);
  let r = (s * 10) % 11;
  if (r === 10) r = 0;
  if (r !== parseInt(d[9], 10)) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(d[i], 10) * (11 - i);
  r = (s * 10) % 11;
  if (r === 10) r = 0;
  return r === parseInt(d[10], 10);
}

function maskTelefone(v: string): string {
  const digits = onlyDigits(v);
  let d = digits;
  if (d.length > 0 && !d.startsWith("55") && d.length <= 11) {
    d = "55" + d;
  }
  d = d.slice(0, 13);
  if (d.length <= 4) return d;
  if (d.length <= 6) return d.replace(/(\d{2})(\d{2})/, "$1 $2");
  if (d.length <= 11) {
    return d.replace(/(\d{2})(\d{2})(\d{1,})/, "$1 $2 $3");
  }
  return d.replace(/(\d{2})(\d{2})(\d{5})(\d{1,})/, "$1 $2 $3-$4");
}

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
  const [recentes, setRecentes] = useState<(Senha & { paciente?: { nome_completo: string; telefone: string | null } | null })[]>([]);
  const [loadingRecentes, setLoadingRecentes] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [unidadeSlug, setUnidadeSlug] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  // cadastro rápido de paciente
  const [novoOpen, setNovoOpen] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoCpf, setNovoCpf] = useState("");
  const [novoTelefone, setNovoTelefone] = useState("");
  const [novoErrors, setNovoErrors] = useState<{ nome?: string; cpf?: string; telefone?: string }>({});
  const [savingNovo, setSavingNovo] = useState(false);

  // compartilhamento
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
      .select("*, paciente:pacientes(nome_completo, telefone)")
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
    if (unidadeId) {
      void (async () => {
        const { data: u, error } = await supabase
          .from("unidades")
          .select("slug, nome, ticket_logo_url, ticket_unidade_nome, ticket_rodape")
          .eq("id", unidadeId)
          .maybeSingle();
        
        if (!error && u) {
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

  // realtime nas senhas via hook compartilhado
  useRealtimeTable({
    table: "senhas",
    filter: unidadeId ? `unidade_id=eq.${unidadeId}` : undefined,
    channelKey: `unidade:${unidadeId}:recepcao`,
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

  const handleGerar = async (pacOrEvent?: Paciente | React.MouseEvent) => {
    const pac = (pacOrEvent && typeof pacOrEvent === 'object' && 'id' in pacOrEvent) 
      ? (pacOrEvent as Paciente) 
      : pacienteSelecionado;

    if (!filaId || !canGerar) return;
    if (!pac) {
      toast.error("Selecione ou cadastre um paciente para gerar a senha");
      return;
    }
    setEmitting(true);
    try {
      const { data, error } = await supabase.rpc("gerar_senha", {
        _fila_id: filaId,
        _prioridade: prioridade,
        _paciente_id: pac.id,
        _origem: "recepcao",
      });
      if (error) throw error;
      const senha = data as unknown as Senha;
      toast.success(`Senha ${senha.codigo} emitida`, {
        description: `Vinculada a ${pac.nome_completo}`,
      });

      // Abre modal de compartilhamento
      setShareData({
        senha: { id: senha.id, codigo: senha.codigo, token_publico: senha.token_publico! },
        paciente: {
          nome_completo: pac.nome_completo,
          telefone: pac.telefone,
        },
      });
      setShareAutoPrint(false);
      setShareOpen(true);
      // limpa paciente, mantém fila/prioridade para próximo atendimento
      setPacienteSelecionado(null);
      setPacienteQuery("");
      setPrioridade("normal");
      // refresh fila para atualizar contador exibido
      void fetchFilas();
    } catch (err: any) {
      console.error("Erro ao gerar senha:", err);
      const msg = err?.message || err?.error_description || "Falha ao gerar senha";
      toast.error(msg);
    } finally {
      setEmitting(false);
    }
  };

  const handleSalvarNovoPaciente = async (emitirSenha = false) => {
    if (!unidadeId) return;
    
    // Validações
    const errors: { nome?: string; cpf?: string; telefone?: string } = {};
    const nome = novoNome.trim();
    const cpfDigits = onlyDigits(novoCpf);
    const telDigits = onlyDigits(novoTelefone);

    if (nome.length < 2) {
      errors.nome = "Informe o nome completo do paciente";
    }
    
    if (!cpfDigits) {
      errors.cpf = "CPF é obrigatório";
    } else if (!isValidCPF(cpfDigits)) {
      errors.cpf = "CPF inválido";
    }

    if (!telDigits) {
      errors.telefone = "Telefone é obrigatório";
    } else if (telDigits.length < 10) {
      errors.telefone = "Telefone inválido";
    }

    if (Object.keys(errors).length > 0) {
      setNovoErrors(errors);
      return;
    }

    setNovoErrors({});
    setSavingNovo(true);
    try {
      const { data, error } = await supabase
        .from("pacientes")
        .insert({
          unidade_id: unidadeId,
          nome_completo: nome,
          cpf: cpfDigits,
          telefone: telDigits,
        })
        .select("*")
        .single();
      
      if (error) {
        if (error.code === "23505") {
          if (error.message?.includes("cpf")) {
            setNovoErrors({ cpf: "Este CPF já está cadastrado" });
          } else {
            toast.error("Paciente já cadastrado");
          }
          return;
        }
        throw error;
      }

      const pac = data as Paciente;
      setPacienteSelecionado(pac);
      setPacienteQuery("");
      setPacientes([]);
      setNovoOpen(false);
      setNovoNome("");
      setNovoCpf("");
      setNovoTelefone("");
      toast.success("Paciente cadastrado", { description: nome });

      if (emitirSenha) {
        await handleGerar(pac);
      }
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

  const handleWhatsApp = async (s: Senha & { paciente?: { nome_completo: string; telefone: string | null } | null }) => {
    if (!s.paciente?.telefone) {
      toast.error("Paciente sem telefone cadastrado");
      return;
    }
    const publicUrl = `${window.location.origin}/s/${s.token_publico}`;
    const tel = s.paciente.telefone.replace(/\D/g, "");
    const text = encodeURIComponent(
      `Olá ${s.paciente.nome_completo}, sua senha no ${unidadeTicketConfig?.nome || "nosso estabelecimento"} é: *${s.codigo}*.\n\nAcompanhe o status do seu atendimento em tempo real clicando no link abaixo:\n${publicUrl}`
    );
    window.open(`https://wa.me/${tel}?text=${text}`, "_blank");

    if (unidadeId) {
      try {
        await supabase.from('notificacoes_log').insert({
          unidade_id: unidadeId,
          senha_id: s.id,
          canal: 'whatsapp',
          destinatario: s.paciente.telefone,
          mensagem: `Ticket ${s.codigo} enviado via WhatsApp`,
          status: 'enviada'
        });
        toast.success("Envio registrado no histórico");
      } catch (err) {
        console.error('Erro ao registrar histórico:', err);
      }
    }
  };

  const handleResetHistorico = async () => {
    if (!unidadeId) return;
    setResetting(true);
    try {
      // Apaga apenas chamadas de senhas já finalizadas (atendidas, ausentes ou canceladas).
      // Preserva chamadas de senhas ativas (aguardando, chamada, em_atendimento).
      const { data: senhasFinalizadas, error: errSenhas } = await supabase
        .from("senhas")
        .select("id")
        .eq("unidade_id", unidadeId)
        .in("status", ["finalizada", "ausente", "cancelada"]);
      if (errSenhas) throw errSenhas;

      const ids = (senhasFinalizadas ?? []).map((s) => s.id);
      if (ids.length === 0) {
        toast.info("Nenhuma chamada atendida para limpar");
        return;
      }

      const { error: errDel, count } = await supabase
        .from("chamadas")
        .delete({ count: "exact" })
        .eq("unidade_id", unidadeId)
        .in("senha_id", ids);
      if (errDel) throw errDel;

      toast.success(
        `Histórico limpo: ${count ?? ids.length} chamada(s) removida(s)`,
        { description: "Senhas em atendimento foram preservadas" },
      );
      void fetchRecentes();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao resetar histórico";
      toast.error(msg);
    } finally {
      setResetting(false);
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
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Operação
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold">Recepção</h1>
          <p className="mt-1 text-muted-foreground">
            Emita senhas em tempo real e acompanhe as últimas geradas.
          </p>
        </div>
        {unidadeSlug && (
          <div className="flex flex-wrap items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="gap-2" disabled={resetting}>
                  {resetting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Resetar histórico
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Resetar histórico de chamadas?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Isso apaga as chamadas de senhas <strong>já atendidas, ausentes ou canceladas</strong> —
                    elas somem do histórico da TV. As senhas em atendimento, chamadas e aguardando são <strong>preservadas</strong>.
                    Essa ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => void handleResetHistorico()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Sim, resetar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button asChild variant="outline" className="gap-2">
              <a
                href={`/tv/${unidadeSlug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Tv className="h-4 w-4" />
                Abrir TV (chamadas e histórico)
              </a>
            </Button>
          </div>
        )}
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
              <Label className="text-sm font-semibold">
                Paciente <span className="text-destructive">*</span>
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setNovoNome(pacienteQuery.trim());
                  setNovoOpen(true);
                }}
                className="h-8 gap-1.5 text-xs font-semibold text-primary border-primary/20 hover:bg-primary/5 hover:text-primary transition-all shadow-sm"
              >
                <UserPlus className="h-3.5 w-3.5" /> 
                <span>Cadastro Rápido</span>
              </Button>
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !pacienteSelecionado && pacienteQuery.trim().length >= 2 && pacientes.length === 0 && !searchingPac) {
                      setNovoNome(pacienteQuery.trim());
                      setNovoOpen(true);
                    }
                  }}
                  placeholder="Buscar por nome ou CPF…"
                  className="pl-9 h-11"
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
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleWhatsApp(s)}
                        className={cn(
                          "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50",
                          !s.paciente?.telefone && "opacity-50 cursor-not-allowed"
                        )}
                        title={s.paciente?.telefone ? "Enviar via WhatsApp" : "Paciente sem telefone"}
                        disabled={!s.paciente?.telefone}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setShareData({
                            senha: { id: s.id, codigo: s.codigo, token_publico: s.token_publico! },
                            paciente: {
                              nome_completo: s.paciente?.nome_completo ?? "Sem nome",
                              telefone: s.paciente?.telefone ?? null,
                            },
                          });
                          setShareAutoPrint(true);
                          setShareOpen(true);
                        }}
                        title="Reimprimir Ticket (80mm)"
                        className="text-primary hover:text-primary hover:bg-primary/10"
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setShareData({
                            senha: { id: s.id, codigo: s.codigo, token_publico: s.token_publico! },
                            paciente: {
                              nome_completo: s.paciente?.nome_completo ?? "Sem nome",
                              telefone: s.paciente?.telefone ?? null,
                            },
                          });
                          setShareAutoPrint(false);
                          setShareOpen(true);
                        }}
                        title="Enviar ou Imprimir"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void copyToken(s.token_publico)}
                        aria-label="Copiar token público"
                        title="Copiar link de acompanhamento"
                      >
                        {copiedToken === s.token_publico ? (
                          <Check className="h-4 w-4 text-primary" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Dialog de cadastro rápido de paciente */}
      <Dialog 
        open={novoOpen} 
        onOpenChange={(open) => {
          setNovoOpen(open);
          if (!open) {
            setNovoErrors({});
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo paciente</DialogTitle>
            <DialogDescription>
              Cadastre rapidamente para vincular à senha.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="novo-nome" className="mb-1.5 block">
                Nome completo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="novo-nome"
                value={novoNome}
                onChange={(e) => {
                  setNovoNome(e.target.value);
                  if (novoErrors.nome) setNovoErrors(prev => ({ ...prev, nome: undefined }));
                }}
                placeholder="Ex: Maria da Silva"
                autoFocus
                className={cn(novoErrors.nome && "border-destructive focus-visible:ring-destructive")}
              />
              {novoErrors.nome && (
                <p className="mt-1 text-xs font-medium text-destructive">{novoErrors.nome}</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="novo-cpf" className="mb-1.5 block">
                  CPF <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="novo-cpf"
                  value={novoCpf}
                  onChange={(e) => {
                    setNovoCpf(maskCPF(e.target.value));
                    if (novoErrors.cpf) setNovoErrors(prev => ({ ...prev, cpf: undefined }));
                  }}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  className={cn(novoErrors.cpf && "border-destructive focus-visible:ring-destructive")}
                />
                {novoErrors.cpf && (
                  <p className="mt-1 text-xs font-medium text-destructive">{novoErrors.cpf}</p>
                )}
              </div>
              <div>
                <Label htmlFor="novo-tel" className="mb-1.5 block">
                  Telefone <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="novo-tel"
                  value={novoTelefone}
                  onChange={(e) => {
                    setNovoTelefone(maskTelefone(e.target.value));
                    if (novoErrors.telefone) setNovoErrors(prev => ({ ...prev, telefone: undefined }));
                  }}
                  placeholder="(00) 00000-0000"
                  inputMode="tel"
                  className={cn(novoErrors.telefone && "border-destructive focus-visible:ring-destructive")}
                />
                {novoErrors.telefone && (
                  <p className="mt-1 text-xs font-medium text-destructive">{novoErrors.telefone}</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setNovoOpen(false);
                setNovoErrors({});
              }} 
              disabled={savingNovo}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button 
                variant="secondary"
                onClick={() => void handleSalvarNovoPaciente(false)} 
                disabled={savingNovo}
                className="w-full sm:w-auto"
              >
                {savingNovo ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Apenas cadastrar"
                )}
              </Button>
              <Button 
                onClick={() => void handleSalvarNovoPaciente(true)} 
                disabled={savingNovo}
                className="w-full sm:w-auto bg-gradient-primary"
              >
                {savingNovo ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Cadastrar e Gerar Senha
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modal de compartilhamento */}
      <TicketShareDialog
        open={shareOpen}
        onOpenChange={(open) => {
          setShareOpen(open);
          if (!open) setShareAutoPrint(false);
        }}
        unidadeId={unidadeId ?? null}
        senha={shareData?.senha ?? null}
        paciente={shareData?.paciente ?? null}
        unidadeNome={unidadeTicketConfig?.nome ?? null}
        logoUrl={unidadeTicketConfig?.logo_url ?? null}
        rodape={unidadeTicketConfig?.rodape ?? null}
        autoPrint={shareAutoPrint}
      />
    </div>
  );
}
