import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
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
    }
  }, [open, senha]);

  const filaAtual = filas.find((f) => f.id === senha.fila_id);
  const filaNova = filas.find((f) => f.id === filaId);
  const mudouFila = filaId !== senha.fila_id;

  // Map de contagem de pessoas aguardando por fila para preview instantâneo.
  const [contagens, setContagens] = useState<Record<string, number>>({});
  const [loadingContagens, setLoadingContagens] = useState(false);

  // Carrega contagens iniciais de todas as filas da unidade ao abrir.
  useEffect(() => {
    if (!open) return;
    
    const carregarContagens = async () => {
      setLoadingContagens(true);
      try {
        const { data } = await supabase
          .from("senhas")
          .select("fila_id")
          .eq("unidade_id", senha.unidade_id)
          .eq("status", "aguardando");

        const map: Record<string, number> = {};
        data?.forEach((s) => {
          map[s.fila_id] = (map[s.fila_id] || 0) + 1;
        });
        setContagens(map);
      } catch (err) {
        console.error("Erro ao carregar preview:", err);
      } finally {
        setLoadingContagens(false);
      }
    };

    void carregarContagens();

    // Inscrição em tempo real para manter o preview atualizado se alguém for chamado ou emitir nova senha.
    const channel = supabase
      .channel(`preview-unidade-${senha.unidade_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "senhas",
          filter: `unidade_id=eq.${senha.unidade_id}`,
        },
        () => {
          void carregarContagens();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [open, senha.unidade_id]);

  // Preview calculado localmente a partir do map de contagens
  const previewPos = filaId ? (contagens[filaId] || 0) : 0;
  const previewTempo = previewPos * (filaNova?.tempo_espera_estimado ?? 10);
  const previewLoading = loadingContagens;

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
    try {
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

      try {
        let posicaoAntes = 0;
        if (mudouFila) {
          const { count } = await supabase
            .from("senhas")
            .select("id", { count: "exact", head: true })
            .eq("fila_id", senha.fila_id)
            .eq("status", "aguardando")
            .lte("created_at", senha.created_at);
          posicaoAntes = count ?? 0;
        }

        const session = await supabase.auth.getSession();
        const userEmail = session.data.session?.user?.email ?? "Sistema";

        await supabase.from("audit_log").insert({
          unidade_id: senha.unidade_id,
          entidade: "senhas",
          entidade_id: senha.id,
          acao: "mover_senha_de_fila",
          resumo: mudouFila
            ? `Senha ${senha.codigo} movida de "${filaAtual?.nome ?? "?"}" para "${filaNova?.nome ?? "?"}" (recolocada no final, tempo recontado)`
            : `Senha ${senha.codigo} editada (prioridade/observações)`,
          dados_antes: {
            tipo: mudouFila ? "movimentacao_fila" : undefined,
            movimentado_em: mudouFila ? new Date().toISOString() : undefined,
            usuario: userEmail,
            fila_id: senha.fila_id,
            fila_nome: filaAtual?.nome,
            prioridade: senha.prioridade,
            posicao: posicaoAntes,
            tempo_base: filaAtual?.tempo_espera_estimado ?? 10,
            tempo_espera_estimado: (senha as { tempo_espera_estimado?: number | null })
              .tempo_espera_estimado,
            created_at: senha.created_at,
          },
          dados_depois: {
            tipo: mudouFila ? "movimentacao_fila" : undefined,
            movimentado_em: mudouFila ? new Date().toISOString() : undefined,
            usuario: userEmail,
            fila_id: filaId,
            fila_nome: filaNova?.nome,
            prioridade,
            posicao: mudouFila ? (previewPos ?? 0) + 1 : undefined,
            tempo_base: filaNova?.tempo_espera_estimado ?? 10,
            tempo_espera_estimado: mudouFila
              ? previewTempo
              : (senha as { tempo_espera_estimado?: number | null }).tempo_espera_estimado,
            created_at: mudouFila ? agora : senha.created_at,
          },
        });
      } catch {
        // auditoria é best-effort
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
                    <ul className="list-disc space-y-0.5 pl-4 text-[11px]">
                      <li>
                        A senha <strong>{senha.codigo}</strong> sai de{" "}
                        <strong>{filaAtual?.nome ?? "—"}</strong> e entra em{" "}
                        <strong>{filaNova?.nome ?? "—"}</strong> como{" "}
                        <strong>última da espera</strong>.
                      </li>
                      <li>
                        O tempo de espera é recontado a partir de agora.
                      </li>
                    </ul>

                    <div className="mt-2 space-y-2 rounded-lg border border-amber-400/40 bg-amber-100/50 p-3 dark:bg-amber-400/5 shadow-inner min-h-[155px] flex flex-col overflow-hidden">
                      <div className="flex items-center justify-between border-b border-amber-400/20 pb-1.5 mb-1.5 shrink-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-900/80 dark:text-amber-200/80">
                          Preview do Recálculo
                        </p>
                      </div>
                      
                      <div className="relative flex-1">
                        {previewLoading ? (
                          <div className="absolute inset-0 space-y-3 animate-in fade-in duration-300">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Skeleton className="h-2 w-12 bg-amber-200/50 dark:bg-amber-800/20" />
                                <Skeleton className="h-4 w-20 bg-amber-200/50 dark:bg-amber-800/20" />
                              </div>
                              <div className="space-y-1">
                                <Skeleton className="h-2 w-12 bg-amber-200/50 dark:bg-amber-800/20" />
                                <Skeleton className="h-4 w-16 bg-amber-200/50 dark:bg-amber-800/20" />
                              </div>
                            </div>
                            <div className="space-y-1.5 pt-1.5 border-t border-amber-400/10 flex flex-col">
                              <Skeleton className="h-2 w-24 bg-amber-200/50 dark:bg-amber-800/20" />
                              <Skeleton className="h-6 w-16 bg-amber-200/50 dark:bg-amber-800/20 mt-1" />
                              <Skeleton className="h-2 w-32 bg-amber-200/50 dark:bg-amber-800/20 mt-2" />
                            </div>
                          </div>
                        ) : (
                          <div className="animate-in fade-in duration-300">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-[9px] font-medium uppercase text-amber-800/60 dark:text-amber-300/60">Nova Posição</p>
                                <p className="text-sm font-bold text-amber-950 dark:text-amber-100">
                                  {previewPos + 1}º <span className="text-[10px] font-normal text-amber-800/70 dark:text-amber-200/70">({previewPos} à frente)</span>
                                </p>
                              </div>
                              <div>
                                <p className="text-[9px] font-medium uppercase text-amber-800/60 dark:text-amber-300/60">Tempo Base</p>
                                <p className="text-sm font-bold text-amber-950 dark:text-amber-100">
                                  {filaNova?.tempo_espera_estimado ?? 10}min <span className="text-[10px] font-normal text-amber-800/70 dark:text-amber-200/70">/pessoa</span>
                                </p>
                              </div>
                            </div>

                            <div className="mt-1 pt-1.5 border-t border-amber-400/10 flex-1">
                              <p className="text-[9px] font-medium uppercase text-amber-800/60 dark:text-amber-300/60">Estimativa de Espera</p>
                              <p className="text-base font-black text-amber-600 dark:text-amber-400 leading-none mt-1">
                                ~{previewTempo} min
                              </p>
                              <p className="mt-2 text-[8px] italic text-amber-800/50 dark:text-amber-200/40 font-medium leading-tight">
                                Cálculo: {previewPos} pessoas × {filaNova?.tempo_espera_estimado ?? 10} min
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <label className="mt-2 flex items-start gap-2 pt-1 cursor-pointer">
                      <Checkbox
                        checked={confirmouMudancaFila}
                        onCheckedChange={(v) => setConfirmouMudancaFila(v === true)}
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
            {mudouFila && !confirmouMudancaFila ? "Confirme a mudança" : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
