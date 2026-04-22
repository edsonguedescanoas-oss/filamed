import { useAuth } from "@/hooks/use-auth";
import { usePlanoAtual } from "@/hooks/use-plano-atual";

/**
 * Verifica se o plano atual da unidade do usuário libera um recurso.
 *
 * Espelha a função SQL `tem_recurso(unidade_id, recurso)`:
 * só retorna `true` quando há assinatura ATIVA/TRIAL com `recursos[chave] = true`.
 *
 * Use junto com <RecursoGate /> para mostrar prompt de upgrade.
 */
export function useRecurso(chave: string) {
  const { profile } = useAuth();
  const { plano, loading } = usePlanoAtual(profile?.unidade_id);

  let ativo = !!plano?.recursos?.[chave];
  const statusOk = plano?.status === "ativa" || plano?.status === "trialing";

  // Temporário: Liberar relatórios para todos os planos por enquanto
  if (chave === "relatorios_avancados") {
    ativo = true;
  }

  return {
    /** True quando o plano libera o recurso e a assinatura está vigente. */
    liberado: ativo && statusOk,
    /** Carregando informações do plano. */
    loading,
    /** Nome do plano atual (para mensagens de upsell). */
    planoNome: plano?.plano_nome ?? null,
    /** Plano completo, caso precise de mais detalhes. */
    plano,
  };
}
