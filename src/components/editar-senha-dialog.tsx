import { useEffect, useState } from "react";
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
    }
  }, [open, senha]);

  const filaAtual = filas.find((f) => f.id === senha.fila_id);
  const filaNova = filas.find((f) => f.id === filaId);
  const mudouFila = filaId !== senha.fila_id;

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
      // Mescla observações no triagem_dados sem perder demais campos
      const dadosAtuais = (senha.triagem_dados as Record<string, unknown> | null) ?? {};
      const novosDados = { ...dadosAtuais, observacoes: observacoes.trim() || undefined };

      const { error } = await supabase
        .from("senhas")
        .update({
          fila_id: filaId,
          prioridade,
          triagem_dados: novosDados,
          updated_at: new Date().toISOString(),
        })
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
            ? `Senha ${senha.codigo} movida de "${filaAtual?.nome ?? "?"}" para "${filaNova?.nome ?? "?"}"`
            : `Senha ${senha.codigo} editada (prioridade/observações)`,
          dados_antes: {
            fila_id: senha.fila_id,
            prioridade: senha.prioridade,
            observacoes: (senha.triagem_dados as { observacoes?: string } | null)?.observacoes,
          },
          dados_depois: {
            fila_id: filaId,
            prioridade,
            observacoes: observacoes.trim() || undefined,
          },
        });
      } catch {
        // auditoria é best-effort — não bloqueia
      }

      toast.success(
        mudouFila
          ? `Senha ${senha.codigo} movida para ${filaNova?.nome}`
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
                    <label className="mt-2 flex items-start gap-2 pt-1">
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
            {mudouFila && !confirmouMudancaFila ? "Confirme a mudança de fila" : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
