import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Megaphone,
  Play,
  CheckCircle2,
  Stethoscope,
  Clock4,
  Activity,
  X,
  ArrowLeftRight,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { PontoAtendimentoSelector } from "@/components/ponto-atendimento-selector";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

import { RoleGuard } from "@/components/role-guard";

export const Route = createFileRoute("/_app/app/atendimento")({
  head: () => ({ meta: [{ title: "Atendimento — FilaMed" }] }),
  component: () => (
    <RoleGuard allow={["medico", "enfermeiro"]} path="/app/atendimento">
      <AtendimentoPage />
    </RoleGuard>
  ),
});

type Prioridade = "normal" | "preferencial" | "urgente";
type Status = "aguardando" | "chamada" | "em_atendimento" | "finalizada" | "ausente" | "cancelada";

type Fila = {
  id: string;
  nome: string;
  prefixo_senha: string;
  cor: string | null;
  ordem: number;
  tipo: Database["public"]["Enums"]["fila_tipo"];
};
type Paciente = { id: string; nome_completo: string };
type Senha = {
  id: string;
  codigo: string;
  fila_id: string;
  paciente_id: string | null;
  status: Status;
   prioridade: Prioridade;
   triagem_dados: any;
   created_at: string;
   updated_at: string;
 };
type Atendimento = {
  id: string;
  senha_id: string;
  iniciado_em: string;
  finalizado_em: string | null;
  duracao_segundos: number | null;
  observacoes: string | null;
  profissional_id: string | null;
};

const PRIO_RANK: Record<Prioridade, number> = { urgente: 0, preferencial: 1, normal: 2 };

function AtendimentoPage() {
  const { profile, hasPermission, user } = useAuth();
  const podeAtender = hasPermission("provide_care");

  const [filas, setFilas] = useState<Fila[]>([]);
  const [pacientes, setPacientes] = useState<Map<string, Paciente>>(new Map());
   const [senhas, setSenhas] = useState<Senha[]>([]);
   const [criterios, setCriterios] = useState<Map<string, string>>(new Map());
  const [atendimentoAtivo, setAtendimentoAtivo] = useState<Atendimento | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  // Modal de chamada e finalização
  const [chamarSenha, setChamarSenha] = useState<Senha | null>(null);
  const [destino, setDestino] = useState("");
  const [finalizar, setFinalizar] = useState<{ atendimento: Atendimento; senha: Senha } | null>(null);
  const [observacoes, setObservacoes] = useState("");
  const [requerRetorno, setRequerRetorno] = useState(false);
  // Preview da senha de retorno (prefixo do guichê + próximo contador).
  // Carregado sob demanda ao abrir a modal de finalização.
  const [previewRetorno, setPreviewRetorno] = useState<{
    prefixo: string;
    proximoCodigo: string;
    filaNome: string;
  } | null>(null);
  // Ponto de atendimento ativo do usuário (Consultório 001, Sala 02…)
  const [pontoAtivo, setPontoAtivo] = useState<{
    id: string;
    nome: string;
    fila_id: string | null;
  } | null>(null);

  // Timer ticker
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Carregamento inicial
  useEffect(() => {
    const unidadeId = profile?.unidade_id;
    if (!unidadeId || !user) return;
    let mounted = true;
    void (async () => {
      setLoading(true);
       const [filasRes, senhasRes, pacRes, ativoRes, critRes] = await Promise.all([
         supabase
           .from("filas")
           .select("id,nome,prefixo_senha,cor,ordem,tipo")
           .eq("unidade_id", unidadeId)
           .eq("ativa", true)
           .order("ordem"),
         supabase
           .from("senhas")
           .select("id,codigo,fila_id,paciente_id,status,prioridade,triagem_dados,created_at,updated_at")
           .eq("unidade_id", unidadeId)
           .in("status", ["aguardando", "chamada", "em_atendimento"])
           .order("created_at"),
         supabase
           .from("pacientes")
           .select("id,nome_completo")
           .eq("unidade_id", unidadeId),
         supabase
           .from("atendimentos")
           .select("id,senha_id,iniciado_em,finalizado_em,duracao_segundos,observacoes,profissional_id")
           .eq("unidade_id", unidadeId)
           .eq("profissional_id", user.id)
           .is("finalizado_em", null)
           .order("iniciado_em", { ascending: false })
           .limit(1)
           .maybeSingle(),
         supabase
           .from("triagem_criterios")
           .select("id,nome")
           .eq("unidade_id", unidadeId),
       ]);
      if (!mounted) return;
      setFilas((filasRes.data ?? []) as Fila[]);
       setSenhas((senhasRes.data ?? []) as Senha[]);
       const map = new Map<string, Paciente>();
       ((pacRes.data ?? []) as Paciente[]).forEach((p) => map.set(p.id, p));
       setPacientes(map);
       const critMap = new Map<string, string>();
       ((critRes.data ?? []) as { id: string; nome: string }[]).forEach((c) => critMap.set(c.id, c.nome));
       setCriterios(critMap);
      setAtendimentoAtivo((ativoRes.data as Atendimento | null) ?? null);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [profile?.unidade_id, user]);

  // Realtime — senhas e atendimentos
  useEffect(() => {
    if (!profile?.unidade_id) return;
    const ch = supabase
      .channel(`unidade:${profile.unidade_id}:atendimento`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "senhas", filter: `unidade_id=eq.${profile.unidade_id}` },
        (payload) => {
          setSenhas((prev) => {
            if (payload.eventType === "INSERT") {
              const s = payload.new as Senha;
              return ["aguardando", "chamada", "em_atendimento"].includes(s.status) ? [...prev, s] : prev;
            }
            if (payload.eventType === "UPDATE") {
              const s = payload.new as Senha;
              const next = prev.some((x) => x.id === s.id)
                ? prev.map((x) => (x.id === s.id ? s : x))
                : [...prev, s];
              return next.filter((x) => ["aguardando", "chamada", "em_atendimento"].includes(x.status));
            }
            if (payload.eventType === "DELETE") {
              const old = payload.old as { id: string };
              return prev.filter((x) => x.id !== old.id);
            }
            return prev;
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [profile?.unidade_id]);

  // Agrupamento e ordenação
  const grupos = useMemo(() => {
    const m = new Map<string, Senha[]>();
    for (const s of senhas) {
      if (s.status !== "aguardando") continue;
      const arr = m.get(s.fila_id) ?? [];
      arr.push(s);
      m.set(s.fila_id, arr);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => {
        const r = PRIO_RANK[a.prioridade] - PRIO_RANK[b.prioridade];
        if (r !== 0) return r;
        return a.created_at.localeCompare(b.created_at);
      });
    }
    return m;
  }, [senhas]);

  const chamadasAtivas = useMemo(
    () => senhas.filter((s) => s.status === "chamada").sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [senhas],
  );
  const filaById = useMemo(() => new Map(filas.map((f) => [f.id, f])), [filas]);
  const filasVisiveis = useMemo(() => {
    const filasAtendimento = filas.filter((f) => f.tipo !== "guiche");
    if (!pontoAtivo?.fila_id) return filasAtendimento;
    return filasAtendimento.filter((f) => f.id === pontoAtivo.fila_id);
  }, [filas, pontoAtivo?.fila_id]);
  const totalAguardandoVisivel = useMemo(() => {
    const ids = new Set(filasVisiveis.map((f) => f.id));
    return senhas.filter((s) => s.status === "aguardando" && ids.has(s.fila_id)).length;
  }, [filasVisiveis, senhas]);

  const handlePontoAtivoChange = useCallback(
    (p: { id: string; nome: string; fila_id: string | null } | null) => {
      setPontoAtivo((prev) => {
        const next = p ? { id: p.id, nome: p.nome, fila_id: p.fila_id } : null;
        if (
          prev?.id === next?.id &&
          prev?.nome === next?.nome &&
          prev?.fila_id === next?.fila_id
        ) {
          return prev;
        }
        return next;
      });
    },
    [],
  );

  // Ações
  const abrirChamar = (s: Senha) => {
    if (atendimentoAtivo) {
      toast.error("Finalize o atendimento atual antes de chamar outra senha.");
      return;
    }
    if (!pontoAtivo) {
      toast.error("Selecione seu ponto de atendimento (consultório/sala) no topo da tela.");
      return;
    }
    setChamarSenha(s);
    // Destino é fixado pelo ponto ativo; o input vira só visualização
    setDestino(pontoAtivo.nome);
  };

  const confirmarChamar = async () => {
    if (!chamarSenha || !user || !profile?.unidade_id) return;
    if (!pontoAtivo) {
      toast.error("Você precisa estar em um ponto de atendimento para chamar.");
      return;
    }
    setActionId(chamarSenha.id);
    try {
      // RPC oficial: registra chamada com destino = nome do ponto
      const { error } = await supabase.rpc("chamar_senha_do_ponto", {
        _senha_id: chamarSenha.id,
        _ponto_atendimento_id: pontoAtivo.id,
      });
      if (error) throw error;
      toast.success(`${chamarSenha.codigo} chamada para ${pontoAtivo.nome}.`);
      setChamarSenha(null);
      setDestino("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao chamar senha.");
    } finally {
      setActionId(null);
    }
  };

  /**
   * Rechamada — preserva o destino original (consultório/sala/guichê) da última
   * chamada da senha. NUNCA injeta a palavra "Rechamada" no texto do destino;
   * ela aparece só no áudio (via observacao=="Rechamada", tratada na TV).
   */
  const rechamar = async (s: Senha, opts?: { silent?: boolean }) => {
    if (!user || !profile?.unidade_id) return;
    // Busca última chamada para reaproveitar o destino real
    const { data: ultima } = await supabase
      .from("chamadas")
      .select("destino")
      .eq("senha_id", s.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const destinoFinal =
      (ultima?.destino && ultima.destino.trim()) ||
      filaById.get(s.fila_id)?.nome ||
      "Atendimento";
    if (!opts?.silent) setActionId(s.id);
    try {
      const { error } = await supabase.from("chamadas").insert({
        unidade_id: profile.unidade_id,
        senha_id: s.id,
        destino: destinoFinal,
        chamado_por: user.id,
        observacao: "Rechamada",
      });
      if (error) throw error;
      // toca de novo o pulse no TV via update
      await supabase
        .from("senhas")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", s.id);
      if (!opts?.silent) toast.success(`${s.codigo} rechamada.`);
    } catch (err) {
      if (!opts?.silent)
        toast.error(err instanceof Error ? err.message : "Falha ao rechamar.");
      else console.warn("[atendimento] Falha na rechamada automática:", err);
    } finally {
      if (!opts?.silent) setActionId(null);
    }
  };

  /**
   * Rechamada automática a cada 30s para qualquer senha em status "chamada"
   * (ou seja: foi chamada mas o atendimento ainda não começou). Para de
   * rechamar assim que o status muda para "em_atendimento" / "finalizada" /
   * "ausente" — controlado naturalmente pela lista `chamadasAtivas`.
   *
   * Usa um Map<senha_id, timestamp_ultimo_disparo> pra garantir que cada
   * senha só dispara a cada 30s independente do tick global.
   */
  const ultimaRechamadaRef = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    if (!user || !profile?.unidade_id) return;
    const interval = setInterval(() => {
      const agora = Date.now();
      for (const s of chamadasAtivas) {
        // Base: quando a senha foi atualizada pela última vez (chamada/rechamada).
        // Toda chamada/rechamada faz update na senha → updated_at avança.
        const baseMs = new Date(s.updated_at).getTime();
        const ultimoDispMs = ultimaRechamadaRef.current.get(s.id) ?? baseMs;
        const referencia = Math.max(baseMs, ultimoDispMs);
        if (agora - referencia >= 30_000) {
          ultimaRechamadaRef.current.set(s.id, agora);
          void rechamar(s, { silent: true });
        }
      }
      // Limpa entradas de senhas que não estão mais ativas
      const ativasIds = new Set(chamadasAtivas.map((s) => s.id));
      for (const id of ultimaRechamadaRef.current.keys()) {
        if (!ativasIds.has(id)) ultimaRechamadaRef.current.delete(id);
      }
    }, 5_000); // verifica a cada 5s; o gate dos 30s é por senha
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chamadasAtivas, user, profile?.unidade_id]);

  const iniciarAtendimento = async (s: Senha) => {
    if (!user || !profile?.unidade_id) return;
    if (atendimentoAtivo) {
      toast.error("Já existe um atendimento em andamento.");
      return;
    }
    // Sem ponto ativo o profissional não tem "endereço" pra atender — bloqueia
    // antes de criar o atendimento pra evitar registro órfão.
    if (!pontoAtivo) {
      toast.error(
        "Selecione seu ponto de atendimento (consultório/sala) no topo da tela antes de iniciar.",
      );
      return;
    }
    setActionId(s.id);
    try {
      const { data: at, error: e1 } = await supabase
        .from("atendimentos")
        .insert({
          unidade_id: profile.unidade_id,
          senha_id: s.id,
          paciente_id: s.paciente_id,
          profissional_id: user.id,
        })
        .select("id,senha_id,iniciado_em,finalizado_em,duracao_segundos,observacoes,profissional_id")
        .single();
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("senhas")
        .update({ status: "em_atendimento", updated_at: new Date().toISOString() })
        .eq("id", s.id);
      if (e2) throw e2;
      setAtendimentoAtivo(at as Atendimento);
      toast.success(`Atendimento iniciado: ${s.codigo}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao iniciar atendimento.");
    } finally {
      setActionId(null);
    }
  };

  const abrirFinalizar = async () => {
    if (!atendimentoAtivo) return;
    const senha = senhas.find((s) => s.id === atendimentoAtivo.senha_id);
    if (!senha) return;
    setFinalizar({ atendimento: atendimentoAtivo, senha });
    setObservacoes("");
    setRequerRetorno(false);
    setPreviewRetorno(null);

    // Carrega a fila do guichê para mostrar o preview da próxima senha.
    // Mesmo cálculo que `gerar_senha_guiche` faz no banco: prefixo + (contador+1).
    if (!profile?.unidade_id) return;
    const { data, error } = await supabase
      .from("filas")
      .select("nome,prefixo_senha,contador_senha")
      .eq("unidade_id", profile.unidade_id)
      .eq("tipo", "guiche")
      .eq("ativa", true)
      .order("ordem")
      .limit(1)
      .maybeSingle();
    if (error || !data) return;
    const proximo = (data.contador_senha ?? 0) + 1;
    setPreviewRetorno({
      filaNome: data.nome,
      prefixo: data.prefixo_senha,
      proximoCodigo: `${data.prefixo_senha}${String(proximo).padStart(3, "0")}`,
    });
  };

  const confirmarFinalizar = async () => {
    if (!finalizar) return;
    // Sem ponto ativo o RPC `finalizar_atendimento_com_retorno` não consegue
    // gerar a senha de retorno no guichê com origem correta. Bloqueia aqui
    // pra dar mensagem clara em vez de erro genérico do banco.
    if (!pontoAtivo) {
      toast.error(
        "Selecione seu ponto de atendimento no topo da tela antes de finalizar.",
      );
      return;
    }
    setActionId(finalizar.atendimento.id);
    try {
      // RPC: finaliza atendimento e (se requer_retorno) gera senha no Guichê
      const { error } = await supabase.rpc("finalizar_atendimento_com_retorno", {
        _atendimento_id: finalizar.atendimento.id,
        _observacoes: observacoes.trim() || undefined,
        _requer_retorno: requerRetorno,
      });
      if (error) throw error;
      const ini = new Date(finalizar.atendimento.iniciado_em);
      const dur = Math.max(0, Math.round((Date.now() - ini.getTime()) / 1000));
      toast.success(
        requerRetorno
          ? `${finalizar.senha.codigo} finalizada (${formatDur(dur)}). Nova senha gerada no Guichê para retorno.`
          : `${finalizar.senha.codigo} finalizada (${formatDur(dur)}).`,
      );
      void supabase.functions.invoke("wa-duck-notify", {
        body: {
          senha_id: finalizar.senha.id,
          tipo: "finalizacao",
          idempotency_key: `finalizacao_${finalizar.senha.id}_${Date.now()}`,
        },
      });
      setAtendimentoAtivo(null);
      setFinalizar(null);
      setObservacoes("");
      setRequerRetorno(false);
      setPreviewRetorno(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao finalizar atendimento.");
    } finally {
      setActionId(null);
    }
  };

  const marcarAusente = async (s: Senha) => {
    setActionId(s.id);
    try {
      const { error } = await supabase
        .from("senhas")
        .update({ status: "ausente", finalizada_em: new Date().toISOString() })
        .eq("id", s.id);
      if (error) throw error;
      toast.success(`${s.codigo} marcada como ausente.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao marcar ausente.");
    } finally {
      setActionId(null);
    }
  };

  // Senha do atendimento ativo
  const senhaAtiva = atendimentoAtivo ? senhas.find((s) => s.id === atendimentoAtivo.senha_id) : null;
  const duracaoAtiva = atendimentoAtivo
    ? Math.max(0, Math.round((Date.now() - new Date(atendimentoAtivo.iniciado_em).getTime()) / 1000))
    : 0;
  // suprime warning de "tick" não usado — usado p/ rerender
  void tick;

  if (!podeAtender) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <Stethoscope className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h2 className="font-display text-xl font-semibold">Acesso restrito</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Apenas profissionais (médico, enfermeiro, recepção ou admin) podem acessar a tela de atendimento.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Profissional
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold">Atendimento</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Chame, atenda e finalize as senhas em tempo real.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Aguardando</div>
          <div className="font-display text-2xl font-bold">{totalAguardandoVisivel}</div>
        </div>
      </div>

      {/* Resumo do ponto ativo: nome + fila vinculada + alerta quando vazio.
          O selector continua sendo a fonte de verdade — esse bloco só dá
          contexto visual rico durante a sessão de atendimento (o profissional
          precisa enxergar de relance "estou atendendo no Consultório 001 →
          fila Cardiologia"). */}
      <div
        className={cn(
          "mt-5 rounded-xl border px-4 py-3",
          pontoAtivo
            ? "border-primary/30 bg-primary/5"
            : "border-amber-500/40 bg-amber-500/5",
        )}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <PontoAtendimentoSelector
            tipos={["consultorio", "exame", "outro"]}
            label="Você está em"
            onChange={handlePontoAtivoChange}
            emptyHint="Nenhum consultório/sala cadastrado. Peça ao admin para criar em /app/pontos."
          />

          {pontoAtivo ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 font-semibold text-primary">
                <MapPin className="h-3.5 w-3.5" />
                {pontoAtivo.nome}
              </span>
              <span className="text-muted-foreground" aria-hidden>
                →
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 font-medium">
                {pontoAtivo.fila_id
                  ? (filaById.get(pontoAtivo.fila_id)?.nome ?? "Fila desconhecida")
                  : "Sem fila vinculada"}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4" />
              Selecione um ponto para chamar e atender pacientes.
            </div>
          )}
        </div>
      </div>

      {/* Atendimento ativo */}
      {atendimentoAtivo && senhaAtiva && (
        <div
          key={atendimentoAtivo.id}
          className="mt-6 rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-glow animate-scale-in"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
                <Activity className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Em atendimento
                </p>
                <div
                  key={`senha-${senhaAtiva.id}`}
                  className="font-display text-3xl font-bold tabular-nums animate-senha-pop"
                >
                  {senhaAtiva.codigo}
                </div>
                {senhaAtiva.paciente_id && (
                  <div className="text-sm text-muted-foreground">
                    {pacientes.get(senhaAtiva.paciente_id)?.nome_completo ?? "Paciente"}
                  </div>
                )}
                {senhaAtiva.triagem_dados?.criterios && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {senhaAtiva.triagem_dados.criterios.map((cid: string) => (
                      <Badge key={cid} variant="outline" className="text-[10px] py-0 h-5 bg-primary/10 border-primary/20 text-primary">
                        {criterios.get(cid) || "Critério"}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1 justify-end">
                  <Clock4 className="h-3 w-3" /> Duração
                </div>
                <div className="font-display text-2xl font-bold tabular-nums transition-colors duration-500">
                  {formatDur(duracaoAtiva)}
                </div>
              </div>
              <Button onClick={abrirFinalizar} className="bg-gradient-primary shadow-soft" size="lg">
                <CheckCircle2 className="h-4 w-4" />
                Finalizar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Chamadas ativas (aguardando paciente comparecer) */}
      {chamadasAtivas.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Chamadas ativas — aguardando paciente
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {chamadasAtivas.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-center justify-between gap-3 animate-fade-up transition-all hover:border-amber-500/60 hover:shadow-soft"
              >
                <div>
                  <div className="font-display text-2xl font-bold tabular-nums">{s.codigo}</div>
                  <div className="text-xs text-muted-foreground">
                    {filaById.get(s.fila_id)?.nome ?? "—"}
                    {s.paciente_id && ` · ${pacientes.get(s.paciente_id)?.nome_completo ?? ""}`}
                  </div>
                  {s.triagem_dados?.criterios && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {s.triagem_dados.criterios.map((cid: string) => (
                        <Badge key={cid} variant="outline" className="text-[9px] py-0 h-4 bg-background/50 border-amber-500/20 text-amber-700 dark:text-amber-300">
                          {criterios.get(cid) || "Critério"}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => rechamar(s)}
                    disabled={actionId === s.id}
                  >
                    <Megaphone className="h-3.5 w-3.5" /> Rechamar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => iniciarAtendimento(s)}
                    disabled={actionId === s.id || !!atendimentoAtivo || !pontoAtivo}
                    title={!pontoAtivo ? "Selecione um ponto de atendimento no topo da tela" : undefined}
                    className="bg-gradient-primary"
                  >
                    <Play className="h-3.5 w-3.5" /> Iniciar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => marcarAusente(s)}
                    disabled={actionId === s.id}
                  >
                    Ausente
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Aguardando por fila */}
      <section className="mt-8 space-y-6">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Aguardando atendimento
        </h2>
        {filasVisiveis.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhuma fila ativa configurada para este ponto.
          </div>
        )}
        {filasVisiveis.map((f) => {
          const arr = grupos.get(f.id) ?? [];
          return (
            <div key={f.id} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div
                className="flex items-center justify-between px-5 py-3 border-b border-border"
                style={{ background: `linear-gradient(90deg, ${f.cor ?? "#3B82F6"}1a, transparent)` }}
              >
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: f.cor ?? "#3B82F6" }} />
                  <span className="font-display font-semibold">{f.nome}</span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {f.prefixo_senha}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">{arr.length} aguardando</span>
              </div>
              {arr.length === 0 ? (
                <div className="p-5 text-sm text-muted-foreground">Nenhuma senha aguardando.</div>
              ) : (
                <ul className="divide-y divide-border">
                  {arr.map((s, idx) => (
                    <li
                      key={s.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <span className="text-xs font-mono text-muted-foreground w-6 text-right">
                          {idx + 1}
                        </span>
                        <span className="font-display text-xl font-bold tabular-nums">{s.codigo}</span>
                         <PrioBadge prioridade={s.prioridade} />
                         {s.triagem_dados?.criterios && (
                           <div className="flex flex-wrap gap-1">
                             {s.triagem_dados.criterios.map((cid: string) => (
                               <Badge key={cid} variant="outline" className="text-[9px] py-0 h-4 bg-muted/50 border-muted-foreground/20">
                                 {criterios.get(cid) || "Critério"}
                               </Badge>
                             ))}
                           </div>
                         )}
                        {s.paciente_id && (
                          <span className="text-sm text-muted-foreground truncate max-w-[18rem]">
                            {pacientes.get(s.paciente_id)?.nome_completo ?? "—"}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {timeAgo(s.created_at)}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => abrirChamar(s)}
                          disabled={actionId === s.id || !!atendimentoAtivo || !pontoAtivo}
                          title={!pontoAtivo ? "Selecione um ponto de atendimento no topo da tela" : undefined}
                          className="bg-gradient-primary"
                        >
                          <Megaphone className="h-3.5 w-3.5" /> Chamar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => marcarAusente(s)}
                          disabled={actionId === s.id}
                        >
                          Ausente
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </section>

      {/* Modal Chamar */}
      <Modal open={!!chamarSenha} onClose={() => setChamarSenha(null)} title="Chamar senha">
        {chamarSenha && (
          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-center gap-3">
              <div className="font-display text-3xl font-bold tabular-nums">{chamarSenha.codigo}</div>
              <PrioBadge prioridade={chamarSenha.prioridade} />
              {chamarSenha.paciente_id && (
                <span className="text-sm text-muted-foreground">
                  {pacientes.get(chamarSenha.paciente_id)?.nome_completo}
                </span>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="destino">Destino</Label>
              <Input id="destino" value={destino} disabled readOnly />
              <p className="text-xs text-muted-foreground">
                Definido automaticamente pelo ponto que você selecionou no topo da tela.
                Para mudar, troque o ponto no seletor.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setChamarSenha(null)}>
                Cancelar
              </Button>
              <Button
                onClick={confirmarChamar}
                disabled={actionId === chamarSenha.id}
                className="bg-gradient-primary"
              >
                {actionId === chamarSenha.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Megaphone className="h-4 w-4" />
                )}
                Chamar agora
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Finalizar */}
      <Modal open={!!finalizar} onClose={() => setFinalizar(null)} title="Finalizar atendimento">
        {finalizar && (
          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="font-display text-2xl font-bold tabular-nums">
                  {finalizar.senha.codigo}
                </div>
                {finalizar.senha.paciente_id && (
                  <span className="text-sm text-muted-foreground">
                    {pacientes.get(finalizar.senha.paciente_id)?.nome_completo}
                  </span>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Duração</div>
                <div className="font-display text-xl font-bold tabular-nums">
                  {formatDur(duracaoAtiva)}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="obs">Observações (opcional)</Label>
              <Textarea
                id="obs"
                rows={4}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Anotações clínicas, encaminhamentos, próximos passos…"
              />
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                  <ArrowLeftRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">Requer retorno ao guichê?</div>
                    <div className="text-xs text-muted-foreground">
                      Se ativo, o sistema gera automaticamente uma nova senha no
                      Guichê para o paciente fazer marcação de retorno.
                    </div>
                  </div>
                </div>
                <Switch checked={requerRetorno} onCheckedChange={setRequerRetorno} />
              </div>

              {requerRetorno && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                      Próxima senha do guichê
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {previewRetorno
                        ? `Será criada automaticamente na fila ${previewRetorno.filaNome}.`
                        : "Calculando próximo código…"}
                    </div>
                  </div>
                  <div className="font-display text-2xl font-bold tabular-nums text-primary">
                    {previewRetorno?.proximoCodigo ?? "—"}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setFinalizar(null)}>
                Cancelar
              </Button>
              <Button
                onClick={confirmarFinalizar}
                disabled={actionId === finalizar.atendimento.id}
                className="bg-gradient-primary"
              >
                {actionId === finalizar.atendimento.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Finalizar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function PrioBadge({ prioridade }: { prioridade: Prioridade }) {
  const map: Record<Prioridade, string> = {
    normal: "bg-muted text-muted-foreground border-border",
    preferencial: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40",
    urgente: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/40",
  };
  const labels: Record<Prioridade, string> = {
    normal: "Normal",
    preferencial: "Preferencial",
    urgente: "Urgente",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        map[prioridade],
      )}
    >
      {labels[prioridade]}
    </span>
  );
}

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      ref={ref}
    >
      <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-elegant">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="font-display text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function formatDur(seg: number) {
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = seg % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function timeAgo(iso: string) {
  const seg = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seg < 60) return `há ${seg}s`;
  const m = Math.floor(seg / 60);
  if (m < 60) return `há ${m}m`;
  const h = Math.floor(m / 60);
  return `há ${h}h${m % 60}m`;
}
