import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ResolucaoPreset = "hd" | "fhd" | "uhd" | "ultrawide";
export type Densidade = "compacto" | "normal";

export interface TvVisualConfig {
  cor_primaria: string;
  cor_fundo: string;
  cor_texto: string;
  logo_url: string | null;
  fundo_url: string | null;
  resolucao_preset: ResolucaoPreset;
  escala_fonte: number;
  densidade: Densidade;
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
          "cor_primaria,cor_fundo,cor_texto,logo_url,fundo_url,resolucao_preset,escala_fonte,densidade",
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
