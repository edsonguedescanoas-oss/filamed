import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";

type Senha = Database["public"]["Tables"]["senhas"]["Row"];
type Fila = Database["public"]["Tables"]["filas"]["Row"];
type Prioridade = Database["public"]["Enums"]["senha_prioridade"];

type Props = {
  senha: Senha;
  filas: Fila[];
  trigger?: React.ReactNode;
  onUpdated?: () => void;
};

export function EditarSenhaDialog({ senha, filas, trigger, onUpdated }: Props) {
  const [open, setOpen] = useState(false);
  const [filaId, setFilaId] = useState(senha.fila_id);
  const [prioridade, setPrioridade] = useState<Prioridade>(senha.prioridade);
  const [observacoes, setObservacoes] = useState<string>(
    (senha.triagem_dados as { observacoes?: string } | null)?.observacoes ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [confirmouMudancaFila, setConfirmouMudancaFila] = useState(false);

  useEffect(() => {
    if (open) {
      setFilaId(senha.fila_id);
      setPrioridade(senha.prioridade);
      setObservacoes(
        (senha.triagem_dados as { observacoes?: string } | null)?.observacoes ?? "",
      );
      setConfirmouMudancaFila(false);
      setSnapshotConfirmado(null);
    }
  }, [open, senha]);

  // Quando o usuário troca a fila de destino, qualquer confirmação prévia
  // perde o sentido — força nova confirmação contra a nova estimativa.
  useEffect(() => {
    setConfirmouMudancaFila(false);
    setSnapshotConfirmado(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filaId]);

  const filaAtual = filas.find((f) => f.id === senha.fila_id);
  const filaNova = filas.find((f) => f.id === filaId);
  const mudouFila = filaId !== senha.fila_id;

  // Pré-visualização do recálculo: quantas pessoas há aguardando na fila
  // de destino agora, e a estimativa de espera resultante.
  const [previewPos, setPreviewPos] = useState<number | null>(null);
  const [previewTempo, setPreviewTempo] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  // Snapshot da contagem que o usuário VIU quando confirmou a regra.
  // Usado para detectar corrida: se a contagem real no momento do save
  // não bate, abortamos e pedimos nova confirmação.
  const [snapshotConfirmado, setSnapshotConfirmado] = useState<number | null>(null);

  // Mapa local "fila_id → quantas senhas aguardando". Carregado UMA vez ao
  // abrir o diálogo (uma única query agrupada para a unidade) e mantido
  // sincronizado por Realtime. Permite que trocar o seletor de fila atualize
  // a estimativa instantaneamente, sem novo round-trip.
  const [contagemPorFila, setContagemPorFila] = useState<Record<string, number>>({});

  // Aplica a estimativa derivada do mapa local (instantâneo).
  const aplicarPreviewLocal = useCallback(
    (targetFilaId: string, mapa: Record<string, number>) => {
      const aguardando = mapa[targetFilaId] ?? 0;
      const tempoPorPessoa =
        filas.find((f) => f.id === targetFilaId)?.tempo_espera_estimado ?? 10;
      setPreviewPos(aguardando);
      setPreviewTempo(aguardando * tempoPorPessoa);
      return aguardando;
    },
    [filas],
  );

  // Fonte da verdade para o save: re-checa direto no banco. Também atualiza
  // o mapa local para que a UI reflita o número observado.
  const fetchPreview = async (targetFilaId: string): Promise<number | null> => {
    const { count, error } = await supabase
      .from("senhas")
      .select("id", { count: "exact", head: true })
      .eq("fila_id", targetFilaId)
      .eq("status", "aguardando");
    if (error) return null;
    const aguardando = count ?? 0;
    setContagemPorFila((prev) =>
      prev[targetFilaId] === aguardando ? prev : { ...prev, [targetFilaId]: aguardando },
    );
    const tempoPorPessoa = filas.find((f) => f.id === targetFilaId)?.tempo_espera_estimado ?? 10;
    setPreviewPos(aguardando);
    setPreviewTempo(aguardando * tempoPorPessoa);
    return aguardando;
  };

  // Bootstrap: carrega contagens de TODAS as filas da unidade de uma vez
  // quando o diálogo abre. Mantém vivo via Realtime no nível da unidade,
  // de forma que trocar o seletor é sempre instantâneo.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPreviewLoading(true);

    void (async () => {
      // Busca os fila_ids das senhas aguardando da unidade. Como Supabase
      // não expõe GROUP BY direto pelo client, contamos no JS — barato
      // porque a unidade típica tem dezenas, não milhares, de senhas vivas.
      const { data, error } = await supabase
        .from("senhas")
        .select("fila_id")
        .eq("unidade_id", senha.unidade_id)
        .eq("status", "aguardando");
      if (cancelled) return;
      if (!error && data) {
        const mapa: Record<string, number> = {};
        for (const r of data as Array<{ fila_id: string }>) {
          mapa[r.fila_id] = (mapa[r.fila_id] ?? 0) + 1;
        }
        setContagemPorFila(mapa);
        // Se já há fila selecionada que difere da atual, mostra o preview já.
        if (filaId && filaId !== senha.fila_id) {
          aplicarPreviewLocal(filaId, mapa);
        }
      }
      setPreviewLoading(false);
    })();

    // Realtime: qualquer mudança em senhas da unidade invalida o mapa.
    // Usamos refetch agrupado (debounce simples) para evitar múltiplos
    // hits em rajada (ex: bulk update da recepção).
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const refetchAgregado = async () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        const { data } = await supabase
          .from("senhas")
          .select("fila_id")
          .eq("unidade_id", senha.unidade_id)
          .eq("status", "aguardando");
        if (cancelled || !data) return;
        const mapa: Record<string, number> = {};
        for (const r of data as Array<{ fila_id: string }>) {
          mapa[r.fila_id] = (mapa[r.fila_id] ?? 0) + 1;
        }
        setContagemPorFila(mapa);
        if (filaId && filaId !== senha.fila_id) {
          aplicarPreviewLocal(filaId, mapa);
        }
      }, 200);
    };

    const channel = supabase
      .channel(`edit-senha-preview:${senha.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "senhas",
          filter: `unidade_id=eq.${senha.unidade_id}`,
        },
        () => {
          if (!cancelled) void refetchAgregado();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, senha.id, senha.unidade_id]);

  // Trocar o seletor: atualiza a estimativa INSTANTANEAMENTE a partir do
  // mapa em memória, sem flicker de loading e sem esperar o servidor.
  useEffect(() => {
    if (!open) return;
    if (!mudouFila || !filaId) {
      setPreviewPos(null);
      setPreviewTempo(null);
      return;
    }
    aplicarPreviewLocal(filaId, contagemPorFila);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filaId, mudouFila, contagemPorFila, aplicarPreviewLocal]);

  const handleSalvar = async () => {
    if (!filaId) {
      toast.error("Selecione a fila");
      return;
    }
    if (mudouFila && !confirmouMudancaFila) {
      toast.warning("Confirme a regra de mudança de fila antes de salvar");
      return;
    }
    setSaving(true);

    // Trava anti-corrida: re-checa a contagem de aguardando na fila de
    // destino IMEDIATAMENTE antes do update. Se chegaram novas senhas
    // entre o preview/confirmação e o clique em salvar, abortamos, atualiza
    // o preview na tela e exigimos nova confirmação.
    if (mudouFila) {
      const atual = await fetchPreview(filaId);
      if (atual === null) {
        toast.error("Não foi possível confirmar a fila de destino. Tente novamente.");
        setSaving(false);
        return;
      }
      const esperado = snapshotConfirmado;
      if (esperado === null || atual !== esperado) {
        setConfirmouMudancaFila(false);
        setSnapshotConfirmado(null);
        const tempoPorPessoa = filaNova?.tempo_espera_estimado ?? 10;
        toast.warning(
          esperado === null
            ? "A estimativa foi atualizada. Confirme novamente antes de salvar."
            : `A fila mudou: agora há ${atual} aguardando (~${atual * tempoPorPessoa} min). Confirme novamente.`,
        );
        setSaving(false);
        return;
      }
    }

    try {
      // Mescla observações no triagem_dados sem perder demais campos.
      // Quando a fila muda, registra um marcador de "movido em" para auditoria
      // e mantém o created_at original em fila_anterior_created_at.
      const dadosAtuais = (senha.triagem_dados as Record<string, unknown> | null) ?? {};
      const novosDados: Record<string, unknown> = {
        ...dadosAtuais,
        observacoes: observacoes.trim() || undefined,
      };
      if (mudouFila) {
        novosDados.fila_anterior_id = senha.fila_id;
        novosDados.fila_anterior_created_at = senha.created_at;
        novosDados.fila_movida_em = new Date().toISOString();
      }

      const agora = new Date().toISOString();

      // Recalcula tempo_espera_estimado e posição quando muda de fila.
      // - created_at é "rebobinado" para agora: a senha vai para o final da
      //   nova fila pelo critério de ordenação por created_at usado em todo
      //   o app (público, guichê, TV).
      // - posicao e tempo_espera_estimado são recalculados automaticamente
      //   pela trigger `trg_senhas_recalcular_posicoes` no servidor — não
      //   enviamos esses campos para evitar divergência com a fonte da
      //   verdade do banco.
      type SenhaUpdate = Database["public"]["Tables"]["senhas"]["Update"];
      const updatePayload: SenhaUpdate = {
        fila_id: filaId,
        prioridade,
        triagem_dados: novosDados as SenhaUpdate["triagem_dados"],
        updated_at: agora,
      };
      if (mudouFila) {
        updatePayload.created_at = agora;
      }

      const { error } = await supabase
        .from("senhas")
        .update(updatePayload)
        .eq("id", senha.id);
      if (error) throw error;

      // Auditoria via insert direto (RLS permite leitura por super admin; insert não tem policy bloqueante)
      // Usa ação informativa para o registro não ser perdido
      try {
        await supabase.from("audit_log").insert({
          unidade_id: senha.unidade_id,
          entidade: "senhas",
          entidade_id: senha.id,
          acao: "editar_ticket_guiche",
          resumo: mudouFila
            ? `Senha ${senha.codigo} movida de "${filaAtual?.nome ?? "?"}" para "${filaNova?.nome ?? "?"}" (recolocada no final, tempo recontado)`
            : `Senha ${senha.codigo} editada (prioridade/observações)`,
          dados_antes: {
            fila_id: senha.fila_id,
            prioridade: senha.prioridade,
            observacoes: (senha.triagem_dados as { observacoes?: string } | null)?.observacoes,
            created_at: senha.created_at,
            tempo_espera_estimado: (senha as { tempo_espera_estimado?: number | null })
              .tempo_espera_estimado,
          },
          dados_depois: {
            fila_id: filaId,
            prioridade,
            observacoes: observacoes.trim() || undefined,
            created_at: mudouFila ? agora : senha.created_at,
            tempo_espera_estimado: mudouFila
              ? filaNova?.tempo_espera_estimado ?? null
              : (senha as { tempo_espera_estimado?: number | null }).tempo_espera_estimado,
            posicao_estimada: mudouFila ? previewPos : undefined,
          },
        });
      } catch {
        // auditoria é best-effort — não bloqueia
      }

      toast.success(
        mudouFila
          ? `Senha ${senha.codigo} → ${filaNova?.nome} (final da fila, ~${previewTempo ?? 0} min)`
          : `Senha ${senha.codigo} atualizada`,
      );
      setOpen(false);
      onUpdated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao editar ticket");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="ghost">
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar ticket {senha.codigo}</DialogTitle>
          <DialogDescription>
            Use para corrigir uma senha colocada na fila errada ou ajustar a
            prioridade. A alteração fica registrada na auditoria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Fila / Especialidade</Label>
            <Select value={filaId} onValueChange={setFilaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a fila" />
              </SelectTrigger>
              <SelectContent>
                {filas.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {mudouFila && (
              <div className="rounded-md border border-amber-300/60 bg-amber-50 p-3 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="space-y-1.5 text-xs leading-relaxed">
                    <p className="font-semibold">
                      Atenção: a senha vai para o FINAL da nova fila
                    </p>
                    <ul className="list-disc space-y-0.5 pl-4">
                      <li>
                        A senha <strong>{senha.codigo}</strong> sai de{" "}
                        <strong>{filaAtual?.nome ?? "—"}</strong> e entra em{" "}
                        <strong>{filaNova?.nome ?? "—"}</strong> como{" "}
                        <strong>última da espera</strong>.
                      </li>
                      <li>
                        A posição original na fila atual é perdida e o tempo de
                        espera é recontado a partir de agora.
                      </li>
                      <li>
                        A prioridade selecionada continua valendo, mas{" "}
                        <strong>não recupera o tempo</strong> já aguardado.
                      </li>
                      <li>
                        A operação fica registrada na auditoria com seu usuário.
                      </li>
                    </ul>
                    <div className="mt-2 rounded border border-amber-400/50 bg-amber-100/60 p-2 text-[11px] dark:bg-amber-400/10">
                      <p className="font-semibold uppercase tracking-wide">
                        Estimativa após a mudança
                      </p>
                      {previewLoading ? (
                        <p className="text-amber-800/80 dark:text-amber-200/80">
                          calculando…
                        </p>
                      ) : (
                        <p>
                          {previewPos === 0 ? (
                            <>
                              Será a <strong>próxima</strong> a ser chamada em{" "}
                              <strong>{filaNova?.nome ?? "—"}</strong>.
                            </>
                          ) : (
                            <>
                              Posição: <strong>{(previewPos ?? 0) + 1}º</strong> ·{" "}
                              {previewPos ?? 0}{" "}
                              {previewPos === 1 ? "pessoa" : "pessoas"} na frente ·
                              espera estimada{" "}
                              <strong>~{previewTempo ?? 0} min</strong>{" "}
                              <span className="text-amber-700/80 dark:text-amber-200/70">
                                ({filaNova?.tempo_espera_estimado ?? 10} min/pessoa)
                              </span>
                            </>
                          )}
                        </p>
                      )}
                    </div>
                    <label className="mt-2 flex items-start gap-2 pt-1">
                      <Checkbox
                        checked={confirmouMudancaFila}
                        onCheckedChange={(v) => {
                          const marcou = v === true;
                          setConfirmouMudancaFila(marcou);
                          // Captura o snapshot da contagem que o usuário
                          // está vendo neste exato momento. Será comparado
                          // contra a contagem real no save.
                          setSnapshotConfirmado(marcou ? previewPos : null);
                        }}
                        aria-label="Ok, entendi a regra de mudança de fila"
                      />
                      <span className="text-xs font-medium">
                        Ok, entendi — pode mover a senha para o final de{" "}
                        {filaNova?.nome ?? "nova fila"}.
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Prioridade</Label>
            <Select value={prioridade} onValueChange={(v) => setPrioridade(v as Prioridade)}>
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

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              rows={3}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Motivo da correção, anotações etc."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={() => void handleSalvar()}
            disabled={saving || (mudouFila && !confirmouMudancaFila)}
            className="bg-gradient-primary"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
            {mudouFila && !confirmouMudancaFila ? "Confirme a mudança de fila" : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
