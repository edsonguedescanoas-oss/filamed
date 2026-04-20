import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type TableName = keyof Database["public"]["Tables"];
type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface UseRealtimeTableOptions {
  /** Nome da tabela do schema public */
  table: TableName;
  /** Filtro postgres_changes, ex: `unidade_id=eq.${id}` */
  filter?: string;
  /** Eventos a observar — default: "*" */
  event?: RealtimeEvent;
  /** Habilita/desabilita a subscrição (útil para esperar dados prontos) */
  enabled?: boolean;
  /** Callback chamado em cada evento (já debounced em 300ms) */
  onChange: () => void;
  /**
   * Identificador único do canal — OBRIGATÓRIO para passar pela RLS de
   * `realtime.messages`. Deve seguir o padrão:
   *  - `unidade:<unidadeId>:<feature>` para usuário autenticado
   *  - `tv:<unidadeId>:<feature>` para painel TV anônimo
   *  - `pub:<recurso>:<id>` para páginas públicas (paciente)
   */
  channelKey: string;
}

/**
 * Subscreve a mudanças realtime numa tabela do Supabase.
 *
 * - Cria UM canal por (table+filter) e refaz cleanup ao desmontar.
 * - Aplica debounce de 300ms em `onChange` para evitar refetches em rajada
 *   quando várias linhas mudam em sequência (ex: bulk update).
 * - Reusa a referência de `onChange` via ref — você pode passar uma função
 *   inline sem causar re-subscribe.
 *
 * IMPORTANTE: `channelKey` deve seguir o padrão de naming validado pela RLS
 * de `realtime.messages` (ver função `realtime_topic_allowed`). Caso contrário
 * o subscribe é silenciosamente bloqueado.
 *
 * Uso:
 * ```ts
 * useRealtimeTable({
 *   table: "senhas",
 *   filter: `unidade_id=eq.${unidadeId}`,
 *   channelKey: `unidade:${unidadeId}:senhas`,
 *   enabled: !!unidadeId,
 *   onChange: () => void fetchData(),
 * });
 * ```
 */
export function useRealtimeTable({
  table,
  filter,
  event = "*",
  enabled = true,
  onChange,
  channelKey,
}: UseRealtimeTableOptions) {
  const onChangeRef = useRef(onChange);
  // Mantém referência atual sem disparar re-subscribe
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!enabled) return;

    const key = channelKey;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const fire = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        onChangeRef.current();
      }, 300);
    };

    const channel = supabase
      .channel(key)
      .on(
        "postgres_changes",
        // O tipo do supabase-js exige "*" | "INSERT" | "UPDATE" | "DELETE"
        // mas a sobrecarga genérica reclama — cast localizado.
        {
          event,
          schema: "public",
          table,
          ...(filter ? { filter } : {}),
        } as never,
        fire,
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      void supabase.removeChannel(channel);
    };
  }, [table, filter, event, enabled, channelKey]);
}
