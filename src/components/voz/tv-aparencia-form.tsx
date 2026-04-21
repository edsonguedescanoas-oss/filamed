import { useEffect, useRef, useState } from "react";
import { Loader2, Monitor, Save, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  DEFAULT_TV_VISUAL,
  RESOLUCAO_PRESETS,
  type Densidade,
  type ResolucaoPreset,
  type TvVisualConfig,
} from "@/hooks/use-tv-visual-config";

interface Props {
  unidadeId: string;
  unidadeSlug: string | null;
}

export function TvAparenciaForm({ unidadeId, unidadeSlug }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cfg, setCfg] = useState<TvVisualConfig>(DEFAULT_TV_VISUAL);

  useEffect(() => {
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
        setCfg({
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

  const update = <K extends keyof TvVisualConfig>(key: K, value: TvVisualConfig[K]) =>
    setCfg((c) => ({ ...c, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("tv_visual_config")
      .upsert({ unidade_id: unidadeId, ...cfg }, { onConflict: "unidade_id" });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Aparência da TV salva!");
  };

  const handleReset = () => setCfg(DEFAULT_TV_VISUAL);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Monitor className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">Aparência da TV</h2>
            <p className="text-sm text-muted-foreground">
              Personalize cores, logo, fundo e tamanho do painel exibido na TV.
            </p>
          </div>
        </div>
      </header>

      {/* Preview */}
      <LivePreviewCard cfg={cfg} unidadeSlug={unidadeSlug} />

      {/* Resolução / Escala / Densidade */}
      <section className="space-y-3">
        <Label className="text-sm font-semibold">Resolução padrão da TV</Label>
        <p className="text-xs text-muted-foreground">
          Escolha a resolução do monitor/TV onde o painel será exibido. Tudo
          (fontes, espaçamentos, cards) será escalado proporcionalmente.
        </p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {(Object.keys(RESOLUCAO_PRESETS) as ResolucaoPreset[]).map((key) => {
            const preset = RESOLUCAO_PRESETS[key];
            const ativo = cfg.resolucao_preset === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => update("resolucao_preset", key)}
                className={`rounded-xl border p-3 text-left transition-all ${
                  ativo
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="text-sm font-semibold">{preset.label.split(" ")[0]}</div>
                <div className="text-[11px] text-muted-foreground">
                  {preset.label.match(/\((.+?)\)/)?.[1]}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="escala" className="text-sm font-semibold">
            Tamanho da fonte ({Math.round(cfg.escala_fonte * 100)}%)
          </Label>
          <Input
            id="escala"
            type="range"
            min={0.5}
            max={1.5}
            step={0.05}
            value={cfg.escala_fonte}
            onChange={(e) => update("escala_fonte", Number(e.target.value))}
          />
          <p className="text-[11px] text-muted-foreground">
            Ajuste fino. Menor = mais informação cabe na tela.
          </p>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Densidade do layout</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["compacto", "normal"] as Densidade[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => update("densidade", d)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-all ${
                  cfg.densidade === d
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Cores */}
      <section className="space-y-3">
        <Label className="text-sm font-semibold">Cores do painel</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          <ColorField
            label="Primária (destaques)"
            value={cfg.cor_primaria}
            onChange={(v) => update("cor_primaria", v)}
          />
          <ColorField
            label="Fundo"
            value={cfg.cor_fundo}
            onChange={(v) => update("cor_fundo", v)}
          />
          <ColorField
            label="Texto"
            value={cfg.cor_texto}
            onChange={(v) => update("cor_texto", v)}
          />
        </div>
      </section>

      {/* Logo */}
      <section className="space-y-2">
        <Label htmlFor="logo_url" className="text-sm font-semibold">
          URL do logo
        </Label>
        <Input
          id="logo_url"
          type="url"
          placeholder="https://exemplo.com/logo.png"
          value={cfg.logo_url ?? ""}
          onChange={(e) => update("logo_url", e.target.value || null)}
        />
        <p className="text-[11px] text-muted-foreground">
          Aparece no cabeçalho do painel. PNG transparente funciona melhor.
        </p>
      </section>

      {/* Fundo */}
      <section className="space-y-2">
        <Label htmlFor="fundo_url" className="text-sm font-semibold">
          URL da imagem de fundo (opcional)
        </Label>
        <Input
          id="fundo_url"
          type="url"
          placeholder="https://exemplo.com/fundo.jpg"
          value={cfg.fundo_url ?? ""}
          onChange={(e) => update("fundo_url", e.target.value || null)}
        />
        <p className="text-[11px] text-muted-foreground">
          Quando definido, substitui a cor de fundo. Use uma imagem em alta
          resolução (recomendado: 1920×1080 ou maior).
        </p>
      </section>

      {/* Ações */}
      <section className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar aparência
        </Button>
        <Button variant="outline" onClick={handleReset}>
          Restaurar padrão
        </Button>
        {unidadeSlug && (
          <Button variant="ghost" asChild className="gap-2 ml-auto">
            <a href={`/tv/${unidadeSlug}`} target="_blank" rel="noreferrer">
              <Eye className="h-4 w-4" />
              Abrir painel da TV
            </a>
          </Button>
        )}
      </section>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded-md border border-input bg-background"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-xs uppercase"
          maxLength={7}
        />
      </div>
    </div>
  );
}

/**
 * Preview ao vivo: carrega a rota real /tv/{slug} em iframe (modo preview),
 * envia a config atual via postMessage e escala visualmente para caber na
 * moldura. Mostra exatamente como a TV ficará — com cores, logo, fundo,
 * densidade e escala aplicados — antes de salvar.
 */
function LivePreviewCard({
  cfg,
  unidadeSlug,
}: {
  cfg: TvVisualConfig;
  unidadeSlug: string | null;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const preset = RESOLUCAO_PRESETS[cfg.resolucao_preset];

  // Aspect ratio da resolução escolhida
  const aspect =
    cfg.resolucao_preset === "ultrawide" ? 21 / 9 : 16 / 9;
  const nativeWidth = preset.width;
  const nativeHeight = Math.round(nativeWidth / aspect);

  // Escuta o "ready" do iframe
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onMsg = (e: MessageEvent) => {
      const data = e.data as { type?: string } | null;
      if (data?.type === "tv-preview-ready") setIframeReady(true);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // Envia config atual sempre que mudar (e quando o iframe estiver pronto)
  useEffect(() => {
    if (!iframeReady) return;
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ type: "tv-visual-preview", config: cfg }, "*");
  }, [cfg, iframeReady]);

  if (!unidadeSlug) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
        <Monitor className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">
          O preview ao vivo aparece quando a unidade tiver um slug definido.
        </p>
      </div>
    );
  }

  const src = `/tv/${unidadeSlug}?kiosk=1&preview=1`;

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-muted/20">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Preview ao vivo (painel real)
        </div>
        <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
          <span
            className={`inline-flex h-1.5 w-1.5 rounded-full ${
              iframeReady ? "animate-pulse bg-emerald-500" : "bg-amber-500"
            }`}
          />
          {preset.label.split(" ")[0]} · {nativeWidth}×{nativeHeight} ·{" "}
          {Math.round(cfg.escala_fonte * 100)}% · {cfg.densidade}
        </div>
      </div>

      {/* Moldura "TV" — escalamos o iframe nativo para caber na largura disponível */}
      <div className="bg-neutral-900 p-3 sm:p-4">
        <ScaledIframe
          src={src}
          iframeRef={iframeRef}
          nativeWidth={nativeWidth}
          nativeHeight={nativeHeight}
          ready={iframeReady}
        />
        <div className="mx-auto mt-2 h-1.5 w-1/4 rounded-b-lg bg-neutral-800" />
        <p className="mt-3 text-center text-[10px] text-muted-foreground">
          Mudanças aparecem aqui em tempo real. Clique em <strong>Salvar</strong> para aplicar nas TVs ao vivo.
        </p>
      </div>
    </div>
  );
}

/**
 * Renderiza um iframe na resolução nativa do preset, escalado via CSS
 * transform para caber na largura disponível mantendo o aspect ratio.
 * Isso preserva o layout exato do painel (mesmo número de pixels que a TV
 * real renderizará).
 */
function ScaledIframe({
  src,
  iframeRef,
  nativeWidth,
  nativeHeight,
  ready,
}: {
  src: string;
  iframeRef: React.MutableRefObject<HTMLIFrameElement | null>;
  nativeWidth: number;
  nativeHeight: number;
  ready: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    setContainerWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  const scale = containerWidth > 0 ? containerWidth / nativeWidth : 1;
  const scaledHeight = nativeHeight * scale;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-lg shadow-2xl ring-1 ring-white/5 bg-black"
      style={{ height: containerWidth > 0 ? `${scaledHeight}px` : undefined }}
    >
      {!ready && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
          <Loader2 className="h-6 w-6 animate-spin text-white/70" />
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={src}
        title="Preview da TV"
        className="absolute left-0 top-0 origin-top-left border-0"
        style={{
          width: `${nativeWidth}px`,
          height: `${nativeHeight}px`,
          transform: `scale(${scale})`,
        }}
      />
    </div>
  );
}
