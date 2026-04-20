import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AssinaturaCiclo = Database["public"]["Enums"]["assinatura_ciclo"];
type AssinaturaEstado = Database["public"]["Enums"]["assinatura_estado"];

export interface PlanoAtual {
  assinatura_id: string;
  plano_id: string;
  plano_slug: string;
  plano_nome: string;
  status: AssinaturaEstado;
  ciclo: AssinaturaCiclo;
  proximo_ciclo_em: string | null;
  recursos: Record<string, boolean> | null;
  limite_filas: number | null;
  limite_atendentes: number | null;
  limite_tvs: number | null;
  limite_senhas_mes: number | null;
  metadata: Record<string, unknown> | null;
  cancelar_no_fim_do_ciclo: boolean;
  gateway_price_id_anual_oneoff: string | null;
}

/**
 * Lê o plano vigente da unidade via RPC `get_plano_atual`.
 * Retorna `null` se a unidade não tem assinatura cadastrada (ainda em trial puro).
 */
export function usePlanoAtual(unidadeId: string | null | undefined) {
  const [plano, setPlano] = useState<PlanoAtual | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!unidadeId) {
      setPlano(null);
      setLoading(false);
      return;
    }
    let cancel = false;
    setLoading(true);
    void (async () => {
      const { data, error } = await supabase.rpc("get_plano_atual", {
        _unidade_id: unidadeId,
      });
      if (cancel) return;
      if (error) {
        setError(error.message);
        setPlano(null);
      } else {
        const row = (data ?? [])[0];
        setPlano(
          row
            ? {
                ...row,
                recursos: (row.recursos as Record<string, boolean> | null) ?? null,
              }
            : null,
        );
      }
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [unidadeId]);

  return { plano, loading, error };
}
