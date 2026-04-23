import { useEffect, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { Database } from "@/integrations/supabase/types";

type PontoTipo = Database["public"]["Enums"]["ponto_tipo"];
type Ponto = {
  id: string;
  nome: string;
  tipo: PontoTipo;
  fila_id: string | null;
};

type PontoPermissao = {
  ponto_atendimento_id: string;
  user_id: string;
};

interface Props {
  /** Filtra os pontos exibidos pelo tipo. */
  tipos: PontoTipo[];
  /** Label do seletor (default: "Você está em"). */
  label?: string;
  /** Callback quando o ponto muda (recebe o ponto completo ou null). */
  onChange?: (ponto: Ponto | null) => void;
  /** Texto exibido quando nenhum ponto está cadastrado. */
  emptyHint?: string;
}

/**
 * Dropdown reutilizável para o atendente declarar em qual ponto de atendimento
 * está operando. Persiste a escolha em `profiles.ponto_atendimento_id` e
 * dispara `onChange` para que a página pai use o ponto na lógica de chamada.
 */
export function PontoAtendimentoSelector({
  tipos,
  label = "Você está em",
  onChange,
  emptyHint = "Nenhum ponto cadastrado. Peça ao admin para criar em /app/pontos.",
}: Props) {
  const { profile, refreshProfile, roles } = useAuth();
  const unidadeId = profile?.unidade_id;
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selecionado, setSelecionado] = useState<string | null>(
    profile?.ponto_atendimento_id ?? null,
  );

  // Carrega pontos da unidade nos tipos pedidos
  useEffect(() => {
    if (!unidadeId) return;
    let cancel = false;
    setLoading(true);
    void (async () => {
      const { data, error } = await supabase
        .from("pontos_atendimento")
        .select("id,nome,tipo,fila_id")
        .eq("unidade_id", unidadeId)
        .eq("ativo", true)
        .in("tipo", tipos)
        .order("nome");
      if (cancel) return;
      if (error) {
        toast.error("Erro ao carregar pontos: " + error.message);
        setPontos([]);
      } else {
        const pontosCarregados = (data ?? []) as Ponto[];
        const temAcessoTotal = roles.some((r) => r === "admin" || r === "gestor" || r === "super_admin");
        if (temAcessoTotal || pontosCarregados.length === 0 || !profile?.id) {
          setPontos(pontosCarregados);
        } else {
          const { data: permissoesData, error: permissoesError } = await supabase
            .from("ponto_atendimento_permissoes" as never)
            .select("ponto_atendimento_id,user_id")
            .in(
              "ponto_atendimento_id",
              pontosCarregados.map((p) => p.id),
            );
          if (permissoesError) {
            toast.error("Erro ao validar permissões dos pontos: " + permissoesError.message);
            setPontos([]);
          } else {
            const permissoes = (permissoesData ?? []) as unknown as PontoPermissao[];
            const pontosPermitidos = pontosCarregados.filter((ponto) => {
              const permissoesDoPonto = permissoes.filter(
                (perm) => perm.ponto_atendimento_id === ponto.id,
              );
              return (
                permissoesDoPonto.length === 0 ||
                permissoesDoPonto.some((perm) => perm.user_id === profile.id)
              );
            });
            setPontos(pontosPermitidos);
          }
        }
      }
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
    // tipos é array, comparamos a string para evitar refetch inútil
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidadeId, profile?.id, roles.join(","), tipos.join(",")]);

  // Mantém o selecionado em sincronia com o profile
  useEffect(() => {
    setSelecionado(profile?.ponto_atendimento_id ?? null);
  }, [profile?.ponto_atendimento_id]);

  // Avisa o pai sempre que o ponto efetivo muda
  useEffect(() => {
    const p = pontos.find((x) => x.id === selecionado) ?? null;
    onChange?.(p);
  }, [selecionado, pontos, onChange]);

  const handleChange = async (value: string) => {
    if (!profile?.id) return;
    const next = value === "__none__" ? null : value;
    setSelecionado(next);
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ ponto_atendimento_id: next })
        .eq("id", profile.id);
      if (error) throw error;
      await refreshProfile();
      const ponto = pontos.find((p) => p.id === next);
      if (ponto) {
        toast.success(`Você agora está em ${ponto.nome}`);
      } else {
        toast.success("Ponto desvinculado");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar ponto");
      // reverte visual
      setSelecionado(profile.ponto_atendimento_id ?? null);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando pontos...
      </div>
    );
  }

  if (pontos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5" />
          <span>{emptyHint}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">
        {label}
      </Label>
      <Select value={selecionado ?? "__none__"} onValueChange={handleChange} disabled={saving}>
        <SelectTrigger className="w-[220px] h-9">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <SelectValue placeholder="Selecione um ponto" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">— sem ponto —</SelectItem>
          {pontos.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
    </div>
  );
}
