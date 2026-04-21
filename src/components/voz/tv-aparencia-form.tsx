import { useEffect, useState } from "react";
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
      <PreviewCard cfg={cfg} />

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

function PreviewCard({ cfg }: { cfg: TvVisualConfig }) {
  const scale = cfg.escala_fonte;
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="border-b border-border bg-muted/30 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        Preview
      </div>
      <div
        className="relative p-6"
        style={{
          backgroundColor: cfg.cor_fundo,
          backgroundImage: cfg.fundo_url ? `url(${cfg.fundo_url})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: cfg.cor_texto,
          minHeight: 220,
        }}
      >
        {cfg.fundo_url && (
          <div className="absolute inset-0 bg-black/40 pointer-events-none" />
        )}
        <div className="relative flex items-center gap-3 mb-4">
          {cfg.logo_url ? (
            <img src={cfg.logo_url} alt="logo" className="h-8 w-8 object-contain" />
          ) : (
            <div
              className="h-8 w-8 rounded-lg"
              style={{ backgroundColor: cfg.cor_primaria }}
            />
          )}
          <div
            className="text-[10px] font-bold uppercase tracking-[0.3em]"
            style={{ color: cfg.cor_primaria }}
          >
            Painel FilaMed
          </div>
        </div>
        <div className="relative">
          <div
            className="font-bold uppercase tracking-[0.3em] opacity-70"
            style={{ fontSize: `${10 * scale}px`, color: cfg.cor_primaria }}
          >
            Senha chamada
          </div>
          <div
            className="font-display font-black leading-none tabular-nums mt-2"
            style={{ fontSize: `${72 * scale}px` }}
          >
            A045
          </div>
          <div
            className="mt-3 font-bold"
            style={{ fontSize: `${20 * scale}px`, color: cfg.cor_primaria }}
          >
            Consultório 02
          </div>
        </div>
      </div>
    </div>
  );
}
