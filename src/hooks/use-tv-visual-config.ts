import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ResolucaoPreset = "hd" | "fhd" | "uhd" | "ultrawide";
export type Densidade = "compacto" | "normal";
export type ContrasteChamadas = "normal" | "alto" | "maximo";

export interface LayoutItem {
  type: "chamada_atual" | "historico" | "midia" | "relogio";
  col_span: number;
  row_span: number;
  order: number;
}

export interface TvVisualConfig {
  cor_primaria: string;
  cor_fundo: string;
  cor_texto: string;
  logo_url: string | null;
  fundo_url: string | null;
  resolucao_preset: ResolucaoPreset;
  escala_fonte: number;
  densidade: Densidade;
  /** Mensagem fixa exibida na faixa inferior do painel (ao lado do logo). */
  mensagem_rodape: string | null;
  /** Nível de contraste aplicado na área de chamadas (tabela + modal). */
  contraste_chamadas: ContrasteChamadas;
  /** Multiplicador (0.1–2.5) das fontes da área de chamadas. */
  escala_chamadas: number;
  /** Multiplicador (0.5–2.0) das fontes do cabeçalho. */
  escala_header: number;
  /** Multiplicador (0.5–2.0) das fontes do rodapé. */
  escala_rodape: number;
  /** Configurações de layout em grid */
  layout_grid_cols: number;
  layout_grid_rows: number;
  layout_items: LayoutItem[];
  auto_ajuste: boolean;
  historico_limite: number;
  historico_quebrar_texto: boolean;
}

export const DEFAULT_TV_VISUAL: TvVisualConfig = {
  cor_primaria: "#3B82F6",
  cor_fundo: "#0F172A",
  cor_texto: "#F8FAFC",
  logo_url: null,
  fundo_url: null,
  resolucao_preset: "fhd",
  escala_fonte: 1,
  densidade: "normal",
  mensagem_rodape: null,
  contraste_chamadas: "normal",
  escala_chamadas: 1,
  escala_header: 1,
  escala_rodape: 1,
  layout_grid_cols: 12,
  layout_grid_rows: 6,
  layout_items: [
    { type: "chamada_atual", col_span: 8, row_span: 6, order: 1 },
    { type: "historico", col_span: 4, row_span: 6, order: 2 },
  ],
  auto_ajuste: false,
  historico_limite: 8,
  historico_quebrar_texto: false,
};

export const RESOLUCAO_PRESETS: Record<
  ResolucaoPreset,
  { label: string; width: number; baseScale: number }
> = {
  hd: { label: "HD (1280×720)", width: 1280, baseScale: 0.75 },
  fhd: { label: "Full HD (1920×1080)", width: 1920, baseScale: 1 },
  uhd: { label: "4K UHD (3840×2160)", width: 3840, baseScale: 1.6 },
  ultrawide: { label: "Ultrawide (2560×1080)", width: 2560, baseScale: 1.15 },
};

/**
 * Lê (e assina realtime) a configuração visual do painel de TV de uma unidade.
 * Retorna defaults quando a unidade ainda não personalizou nada.
 */
export function useTvVisualConfig(unidadeId: string | null | undefined) {
  const [config, setConfig] = useState<TvVisualConfig>(DEFAULT_TV_VISUAL);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!unidadeId) {
      setLoading(false);
      return;
    }
    let mounted = true;
    void (async () => {
      const { data } = await supabase
        .from("tv_visual_config")
        .select(
          "cor_primaria,cor_fundo,cor_texto,logo_url,fundo_url,resolucao_preset,escala_fonte,densidade,mensagem_rodape,contraste_chamadas,escala_chamadas,layout_grid_cols,layout_grid_rows,layout_items,auto_ajuste,historico_limite,historico_quebrar_texto",
        )
        .eq("unidade_id", unidadeId)
        .maybeSingle();
      if (!mounted) return;
      if (data) {
        setConfig({
          cor_primaria: data.cor_primaria ?? DEFAULT_TV_VISUAL.cor_primaria,
          cor_fundo: data.cor_fundo ?? DEFAULT_TV_VISUAL.cor_fundo,
          cor_texto: data.cor_texto ?? DEFAULT_TV_VISUAL.cor_texto,
          logo_url: data.logo_url,
          fundo_url: data.fundo_url,
          resolucao_preset: (data.resolucao_preset as ResolucaoPreset) ?? "fhd",
          escala_fonte: Number(data.escala_fonte) || 1,
          densidade: (data.densidade as Densidade) ?? "normal",
          mensagem_rodape: data.mensagem_rodape ?? null,
          contraste_chamadas:
            (data.contraste_chamadas as ContrasteChamadas) ?? "normal",
          escala_chamadas: Number(data.escala_chamadas) || 1,
          layout_grid_cols: Number(data.layout_grid_cols) || 12,
          layout_grid_rows: Number(data.layout_grid_rows) || 6,
          layout_items: (data.layout_items as unknown as LayoutItem[]) || DEFAULT_TV_VISUAL.layout_items,
          auto_ajuste: !!data.auto_ajuste,
          historico_limite: Number(data.historico_limite) || 8,
          historico_quebrar_texto: !!data.historico_quebrar_texto,
        });
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [unidadeId]);
  // Realtime
  useEffect(() => {
    if (!unidadeId) return;
    const ch = supabase
      .channel(`tv:${unidadeId}:visual-cfg`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tv_visual_config",
          filter: `unidade_id=eq.${unidadeId}`,
        },
        (payload) => {
          const row = payload.new as Partial<TvVisualConfig> | null;
          if (!row) return;
          setConfig((prev) => ({
            ...prev,
            ...row,
            escala_fonte: Number(row.escala_fonte) || prev.escala_fonte,
          }));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [unidadeId]);

  return { config, loading, setConfig };
}
