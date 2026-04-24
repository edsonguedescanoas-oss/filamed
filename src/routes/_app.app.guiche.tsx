import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Megaphone,
  Ticket,
  ArrowRight,
  Search,
  User as UserIcon,
  Clock4,
  AlertCircle,
  CalendarCheck,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RoleGuard } from "@/components/role-guard";
import { PontoAtendimentoSelector } from "@/components/ponto-atendimento-selector";
import { HistoricoPonto } from "@/components/historico-ponto";
import { EditarSenhaDialog } from "@/components/editar-senha-dialog";
import type { Database } from "@/integrations/supabase/types";

type Senha = Database["public"]["Tables"]["senhas"]["Row"];
type Fila = Database["public"]["Tables"]["filas"]["Row"];
type Paciente = Database["public"]["Tables"]["pacientes"]["Row"];
type FilaTipo = Database["public"]["Enums"]["fila_tipo"];

type Ponto = {
  id: string;
  nome: string;
  tipo: Database["public"]["Enums"]["ponto_tipo"];
  fila_id: string | null;
};

export const Route = createFileRoute("/_app/app/guiche")({
  head: () => ({ meta: [{ title: "Guichê — FilaMed" }] }),
  component: () => (
    <RoleGuard allow={["recepcao"]} path="/app/guiche">
      <GuichePage />
    </RoleGuard>
  ),
});

function GuichePage() {
  const { profile, user } = useAuth();
  const unidadeId = profile?.unidade_id;

  const [ponto, setPonto] = useState<Ponto | null>(null);
  const [filaGuiche, setFilaGuiche] = useState<Fila | null>(null);
  const [filasDestino, setFilasDestino] = useState<Fila[]>([]);
  const [todasFilas, setTodasFilas] = useState<Fila[]>([]);
  const [senhas, setSenhas] = useState<Senha[]>([]);
  const [pacientes, setPacientes] = useState<Map<string, Paciente>>(new Map());
  const [buscaAgendamento, setBuscaAgendamento] = useState("");
  const [filtroBuscaData, setFiltroBuscaData] = useState("");
  const [filtroBuscaTipo, setFiltroBuscaTipo] = useState<"todos" | "agendamento" | "paciente">("todos");
  const [ordenacaoBusca, setOrdenacaoBusca] = useState<"relevancia" | "data_desc" | "data_asc" | "nome">("relevancia");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  // Painel de classificação para a senha chamada
  const [chamada, setChamada] = useState<Senha | null>(null);
  const [classificacao, setClassificacao] = useState<{
    fila_destino_id: string;
    tipo: "agendado" | "avulso" | "retorno";
    prioridade: Database["public"]["Enums"]["senha_prioridade"];
    observacoes: string;
  }>({
    fila_destino_id: "",
    tipo: "avulso",
    prioridade: "normal",
    observacoes: "",
  });

  // Estável para evitar refetch do selector
  const tiposGuiche = useMemo<Array<Database["public"]["Enums"]["ponto_tipo"]>>(
    () => ["guiche"],
    [],
  );

  const fetchData = useCallback(async () => {
    if (!unidadeId) return;
    setLoading(true);
    const [filasRes, senhasRes, pacRes] = await Promise.all([
      supabase
        .from("filas")
        .select("*")
        .eq("unidade_id", unidadeId)
        .eq("ativa", true)
        .order("ordem"),
      supabase
        .from("senhas")
        .select("*")
        .eq("unidade_id", unidadeId)
        .in("status", ["aguardando", "chamada"])
        .order("created_at"),
      supabase.from("pacientes").select("*").eq("unidade_id", unidadeId),
    ]);
    if (filasRes.error) toast.error("Erro ao carregar filas: " + filasRes.error.message);
    if (senhasRes.error) toast.error("Erro ao carregar senhas: " + senhasRes.error.message);

    const todasFilasData = (filasRes.data ?? []) as Fila[];
    const guiche = todasFilasData.find((f) => f.tipo === ("guiche" as FilaTipo)) ?? null;
    setFilaGuiche(guiche);
    setFilasDestino(todasFilasData.filter((f) => f.tipo !== ("guiche" as FilaTipo)));
    setTodasFilas(todasFilasData);
    setSenhas((senhasRes.data ?? []) as Senha[]);

    const map = new Map<string, Paciente>();
    ((pacRes.data ?? []) as Paciente[]).forEach((p) => map.set(p.id, p));
    setPacientes(map);

    setLoading(false);
  }, [unidadeId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Realtime nas senhas da fila Guichê
  useRealtimeTable({
    table: "senhas",
    filter: unidadeId ? `unidade_id=eq.${unidadeId}` : undefined,
    channelKey: `unidade:${unidadeId}:guiche`,
    enabled: !!unidadeId,
    onChange: () => void fetchData(),
  });

  const senhasGuiche = useMemo(() => {
    if (!filaGuiche) return [];
    return senhas
      .filter((s) => s.fila_id === filaGuiche.id && s.status === "aguardando")
      .sort((a, b) => {
        // urgente > preferencial > normal
        const rank = { urgente: 0, preferencial: 1, normal: 2 } as const;
        const r = rank[a.prioridade] - rank[b.prioridade];
        if (r !== 0) return r;
        return a.created_at.localeCompare(b.created_at);
      });
  }, [senhas, filaGuiche]);

  const senhasChamadasNoMeuPonto = useMemo(() => {
    if (!filaGuiche) return [];
    return senhas.filter((s) => s.fila_id === filaGuiche.id && s.status === "chamada");
  }, [senhas, filaGuiche]);

  const pacientesLista = useMemo(() => Array.from(pacientes.values()), [pacientes]);

  const resultadosAgendamento = useMemo(() => {
    const termo = buscaAgendamento.trim().toLowerCase();
    if (termo.length < 2) return [];

    const resultados = pacientesLista
      .map((p) => {
        const tipo = p.created_at.slice(0, 10) === new Date().toISOString().slice(0, 10) ? "agendamento" : "paciente";
        const campos = [
          { chave: "nome", rotulo: "Nome", valor: p.nome_completo },
          { chave: "telefone", rotulo: "Telefone", valor: p.telefone },
          { chave: "cpf", rotulo: "CPF", valor: p.cpf },
          { chave: "documento", rotulo: "Documento", valor: p.identificacao_numero },
        ].filter((campo): campo is { chave: string; rotulo: string; valor: string } => Boolean(campo.valor));

        const matches = campos.filter((campo) => campo.valor.toLowerCase().includes(termo));
        return { paciente: p, tipo, data: p.created_at.slice(0, 10), matches };
      })
      .filter((resultado) => resultado.matches.length > 0)
      .filter((resultado) => !filtroBuscaData || resultado.data === filtroBuscaData)
      .filter((resultado) => filtroBuscaTipo === "todos" || resultado.tipo === filtroBuscaTipo);

    resultados.sort((a, b) => {
      if (ordenacaoBusca === "nome") return a.paciente.nome_completo.localeCompare(b.paciente.nome_completo);
      if (ordenacaoBusca === "data_asc") return a.data.localeCompare(b.data);
      if (ordenacaoBusca === "data_desc") return b.data.localeCompare(a.data);
      return b.matches.length - a.matches.length || a.paciente.nome_completo.localeCompare(b.paciente.nome_completo);
    });

    return resultados.slice(0, 8);
  }, [buscaAgendamento, filtroBuscaData, filtroBuscaTipo, ordenacaoBusca, pacientesLista]);

  const proximaSenha = senhasGuiche[0] ?? null;

  const handleChamarProxima = async () => {
    if (!proximaSenha) {
      toast.info("Nenhuma senha aguardando.");
      return;
    }
    if (!ponto) {
      toast.error("Selecione o ponto de atendimento (ex: Guichê 02) antes de chamar.");
      return;
    }
    setActionId(proximaSenha.id);
    try {
      const { error } = await supabase.rpc("chamar_senha_do_ponto", {
        _senha_id: proximaSenha.id,
        _ponto_atendimento_id: ponto.id,
      });
      if (error) throw error;
      toast.success(`${proximaSenha.codigo} → ${ponto.nome}`);
      setChamada(proximaSenha);
      setClassificacao({
        fila_destino_id: filasDestino[0]?.id ?? "",
        tipo: "avulso",
        prioridade: "normal",
        observacoes: "",
      });
      setBuscaAgendamento("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao chamar senha.");
    } finally {
      setActionId(null);
    }
  };

  const handleRechamar = async (s: Senha) => {
    if (!ponto || !user || !unidadeId) {
      toast.error("Selecione um ponto antes de rechamar.");
      return;
    }
    setActionId(s.id);
    try {
      const { error } = await supabase.from("chamadas").insert({
        unidade_id: unidadeId,
        senha_id: s.id,
        destino: ponto.nome,
        chamado_por: user.id,
        observacao: "Rechamada",
      });
      if (error) throw error;
      await supabase
        .from("senhas")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", s.id);
      toast.success(`${s.codigo} rechamada.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao rechamar.");
    } finally {
      setActionId(null);
    }
  };

  const handleEncaminhar = async () => {
    if (!chamada) return;
    if (!classificacao.fila_destino_id) {
      toast.error("Selecione a fila de destino (especialidade).");
      return;
    }
    setActionId(chamada.id);
    try {
      const { data, error } = await supabase.rpc("encaminhar_do_guiche", {
        _senha_guiche_id: chamada.id,
        _fila_destino_id: classificacao.fila_destino_id,
        _tipo: classificacao.tipo,
        _observacoes: classificacao.observacoes.trim() || undefined,
        _prioridade: classificacao.prioridade,
      });
      if (error) throw error;
      const novaSenha = data as unknown as Senha;
      const filaDest = filasDestino.find((f) => f.id === classificacao.fila_destino_id);
      toast.success(`Senha ${novaSenha.codigo} criada`, {
        description: `Encaminhada para ${filaDest?.nome ?? "fila clínica"}`,
      });
      void supabase.functions.invoke("wa-duck-notify", {
        body: {
          senha_id: novaSenha.id,
          tipo: "encaminhamento",
          mesa_nome: filaDest?.nome ?? "atendimento",
          idempotency_key: `encaminhamento_${novaSenha.id}_${novaSenha.updated_at}`,
        },
      });
      setChamada(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao encaminhar.");
    } finally {
      setActionId(null);
    }
  };

  const handleMarcarAusente = async (s: Senha) => {
    setActionId(s.id);
    try {
      const { error } = await supabase
        .from("senhas")
        .update({ status: "ausente", finalizada_em: new Date().toISOString() })
        .eq("id", s.id);
      if (error) throw error;
      toast.success(`${s.codigo} marcada como ausente.`);
      if (chamada?.id === s.id) setChamada(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao marcar ausente.");
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pacienteChamado = chamada?.paciente_id ? pacientes.get(chamada.paciente_id) : null;

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Guichê</p>
          <h1 className="mt-1 font-display text-3xl font-bold">Atendimento de balcão</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Chame por ordem de chegada, classifique e encaminhe para a especialidade correta.
          </p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <PontoAtendimentoSelector
            tipos={tiposGuiche}
            label="Você está em"
            emptyHint="Nenhum guichê cadastrado. Peça ao admin para criar em /app/pontos."
            onChange={setPonto}
          />
          <div className="text-xs text-muted-foreground">
            {senhasGuiche.length} aguardando
          </div>
        </div>
      </div>

      {!filaGuiche && (
        <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="text-sm">
            A fila <strong>Guichê</strong> ainda não foi criada para esta unidade.
            Ela é criada automaticamente — recarregue a página em alguns segundos.
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* Coluna 1: lista de espera */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-primary" />
                <span className="font-display font-semibold">Próximas no guichê</span>
              </div>
              <Button
                onClick={handleChamarProxima}
                disabled={!proximaSenha || !ponto || !!chamada || actionId === proximaSenha?.id}
                className="bg-gradient-primary"
                size="sm"
              >
                {actionId === proximaSenha?.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Megaphone className="h-3.5 w-3.5" />
                )}
                Chamar próxima
              </Button>
            </div>

            {senhasGuiche.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Nenhuma senha aguardando.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {senhasGuiche.map((s, idx) => {
                  const pac = s.paciente_id ? pacientes.get(s.paciente_id) : null;
                  return (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/20"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-mono text-muted-foreground w-6 text-right">
                          {idx + 1}
                        </span>
                        <span className="font-display text-xl font-bold tabular-nums">
                          {s.codigo}
                        </span>
                        <PrioBadge prioridade={s.prioridade} />
                        {pac && (
                          <span className="text-sm text-muted-foreground truncate max-w-[14rem]">
                            {pac.nome_completo}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="text-xs text-muted-foreground">
                          {timeAgo(s.created_at)}
                        </span>
                        <EditarSenhaDialog
                          senha={s}
                          filas={todasFilas}
                          onUpdated={() => void fetchData()}
                          trigger={
                            <Button size="sm" variant="ghost" className="h-7 px-2" title="Editar ticket">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          }
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {senhasChamadasNoMeuPonto.length > 0 && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 overflow-hidden">
              <div className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                Aguardando paciente comparecer
              </div>
              <ul className="divide-y divide-amber-500/20">
                {senhasChamadasNoMeuPonto.map((s) => {
                  const pac = s.paciente_id ? pacientes.get(s.paciente_id) : null;
                  return (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-3 px-5 py-3"
                    >
                      <div>
                        <div className="font-display text-lg font-bold tabular-nums">
                          {s.codigo}
                        </div>
                        {pac && (
                          <div className="text-xs text-muted-foreground">{pac.nome_completo}</div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRechamar(s)}
                          disabled={actionId === s.id}
                        >
                          <Megaphone className="h-3.5 w-3.5" /> Rechamar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleMarcarAusente(s)}
                          disabled={actionId === s.id}
                        >
                          Ausente
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Coluna 2: painel da senha em atendimento */}
        <div>
          {chamada ? (
            <div className="rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/5 via-card to-card p-6 shadow-soft">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Em atendimento no guichê
                  </p>
                  <div className="mt-1 font-display text-4xl font-bold tabular-nums">
                    {chamada.codigo}
                  </div>
                  {pacienteChamado && (
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{pacienteChamado.nome_completo}</span>
                    </div>
                  )}
                  {pacienteChamado?.telefone && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Tel: {pacienteChamado.telefone}
                    </div>
                  )}
                  {pacienteChamado?.data_nascimento && (
                    <div className="text-xs text-muted-foreground">
                      Nasc: {new Date(pacienteChamado.data_nascimento).toLocaleDateString("pt-BR")}
                    </div>
                  )}
                  <div className="mt-4 rounded-xl border border-border bg-background/60 p-3">
                    <Label htmlFor="busca-agendamento" className="flex items-center gap-2 text-xs">
                      <CalendarCheck className="h-3.5 w-3.5 text-primary" />
                      Buscar agendamento/paciente prévio
                    </Label>
                    <Input
                      id="busca-agendamento"
                      className="mt-2 h-9"
                      value={buscaAgendamento}
                      onChange={(e) => setBuscaAgendamento(e.target.value)}
                      placeholder="Nome, telefone, CPF ou documento"
                    />
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      <Input
                        type="date"
                        className="h-8 text-xs"
                        value={filtroBuscaData}
                        onChange={(e) => setFiltroBuscaData(e.target.value)}
                      />
                      <Select value={filtroBuscaTipo} onValueChange={(v) => setFiltroBuscaTipo(v as typeof filtroBuscaTipo)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                          <SelectItem value="agendamento">Agendamento</SelectItem>
                          <SelectItem value="paciente">Paciente</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={ordenacaoBusca} onValueChange={(v) => setOrdenacaoBusca(v as typeof ordenacaoBusca)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="relevancia">Relevância</SelectItem>
                          <SelectItem value="data_desc">Mais recentes</SelectItem>
                          <SelectItem value="data_asc">Mais antigos</SelectItem>
                          <SelectItem value="nome">Nome</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {buscaAgendamento.trim().length >= 2 && (
                      <div className="mt-2 space-y-1">
                        {resultadosAgendamento.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Nenhum registro encontrado.</p>
                        ) : (
                          resultadosAgendamento.map(({ paciente: p, tipo, data, matches }) => (
                            <button
                              key={p.id}
                              type="button"
                              className="block w-full rounded-md border border-border bg-card px-3 py-2 text-left text-xs hover:bg-muted/40"
                              onClick={() =>
                                setClassificacao((c) => ({
                                  ...c,
                                  tipo: "agendado",
                                  observacoes: [
                                    c.observacoes,
                                    `Agendamento prévio localizado: ${p.nome_completo}${p.telefone ? ` · ${p.telefone}` : ""}`,
                                  ]
                                    .filter(Boolean)
                                    .join("\n"),
                                }))
                              }
                            >
                              <span className="font-medium">{highlightTerm(p.nome_completo, buscaAgendamento)}</span>
                              {p.telefone && <span className="text-muted-foreground"> · {highlightTerm(p.telefone, buscaAgendamento)}</span>}
                              <span className="ml-2 rounded border border-border px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                                {tipo === "agendamento" ? "Agendamento" : "Paciente"} · {new Date(data).toLocaleDateString("pt-BR")}
                              </span>
                              <span className="mt-1 block text-[11px] text-muted-foreground">
                                Campos: {matches.map((m) => `${m.rotulo}: ${m.valor}`).join(" · ")}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleMarcarAusente(chamada)}
                >
                  Marcar ausente
                </Button>
              </div>

              <div className="mt-6 space-y-4 border-t border-border pt-5">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Search className="h-4 w-4" /> Classificar e encaminhar
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Especialidade / Fila *</Label>
                    <Select
                      value={classificacao.fila_destino_id}
                      onValueChange={(v) =>
                        setClassificacao((c) => ({ ...c, fila_destino_id: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a fila" />
                      </SelectTrigger>
                      <SelectContent>
                        {filasDestino.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={classificacao.tipo}
                      onValueChange={(v) =>
                        setClassificacao((c) => ({
                          ...c,
                          tipo: v as "agendado" | "avulso" | "retorno",
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="agendado">Agendado</SelectItem>
                        <SelectItem value="avulso">Avulso</SelectItem>
                        <SelectItem value="retorno">Retorno</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <Select
                      value={classificacao.prioridade}
                      onValueChange={(v) =>
                        setClassificacao((c) => ({
                          ...c,
                          prioridade: v as Database["public"]["Enums"]["senha_prioridade"],
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="preferencial">Preferencial</SelectItem>
                        <SelectItem value="urgente">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    rows={3}
                    value={classificacao.observacoes}
                    onChange={(e) =>
                      setClassificacao((c) => ({ ...c, observacoes: e.target.value }))
                    }
                    placeholder="Anotações para o profissional, agendamento prévio, etc."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setChamada(null)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleEncaminhar}
                    disabled={actionId === chamada.id || !classificacao.fila_destino_id}
                    className="bg-gradient-primary"
                  >
                    {actionId === chamada.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                    Encaminhar e gerar senha
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-muted/10 p-10 text-center">
              <Ticket className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
              <h3 className="font-display text-lg font-semibold">Nenhum paciente em atendimento</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {ponto
                  ? "Clique em 'Chamar próxima' para chamar o próximo paciente da fila."
                  : "Selecione seu ponto de atendimento no topo para começar."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Histórico do guichê — pré-filtrado pelo ponto selecionado quando houver
          (recepção quer ver o que ELA fez); cai pra "todos os guichês" se não
          houver ponto, pra que o supervisor consiga auditar o turno inteiro. */}
      {unidadeId && (
        <div className="mt-8">
          <HistoricoPonto
            unidadeId={unidadeId}
            tiposPermitidos={tiposGuiche}
            pontoFixoId={ponto?.id}
            titulo={ponto ? `Histórico — ${ponto.nome}` : "Histórico dos guichês"}
          />
        </div>
      )}
    </div>
  );
}

function highlightTerm(text: string, termo: string) {
  const valor = termo.trim();
  if (!valor) return text;
  const index = text.toLowerCase().indexOf(valor.toLowerCase());
  if (index < 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-primary/15 px-0.5 text-primary">{text.slice(index, index + valor.length)}</mark>
      {text.slice(index + valor.length)}
    </>
  );
}

function PrioBadge({ prioridade }: { prioridade: Database["public"]["Enums"]["senha_prioridade"] }) {
  const map = {
    normal: "bg-muted text-muted-foreground border-border",
    preferencial: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40",
    urgente: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/40",
  } as const;
  const labels = { normal: "Normal", preferencial: "Pref.", urgente: "Urgente" } as const;
  return (
    <Badge variant="outline" className={"text-[10px] uppercase " + map[prioridade]}>
      {labels[prioridade]}
    </Badge>
  );
}

function timeAgo(iso: string) {
  const seg = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seg < 60) return `há ${seg}s`;
  const m = Math.floor(seg / 60);
  if (m < 60) return `há ${m}m`;
  const h = Math.floor(m / 60);
  return `há ${h}h${m % 60}m`;
}
