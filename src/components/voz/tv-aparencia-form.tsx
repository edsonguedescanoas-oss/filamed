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
          "cor_primaria,cor_fundo,cor_texto,logo_url,fundo_url,resolucao_preset,escala_fonte,densidade,mensagem_rodape",
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
          mensagem_rodape: data.mensagem_rodape ?? null,
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

      {/* Mensagem do rodapé */}
      <section className="space-y-2">
        <Label htmlFor="mensagem_rodape" className="text-sm font-semibold">
          Mensagem do rodapé (opcional)
        </Label>
        <Input
          id="mensagem_rodape"
          type="text"
          maxLength={140}
          placeholder="Ex.: Bem-vindo à Clínica X — Wi-Fi: clinica2024"
          value={cfg.mensagem_rodape ?? ""}
          onChange={(e) => update("mensagem_rodape", e.target.value || null)}
        />
        <p className="text-[11px] text-muted-foreground">
          Aparece na faixa inferior do painel, ao lado do logo. Até 140 caracteres.
        </p>
      </section>

      {/* Mídias do carrossel (imagem / vídeo / YouTube) */}
      <SinalizacaoManager unidadeId={unidadeId} />

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
  // Escala combinando preset de resolução + ajuste fino
  const baseScale = RESOLUCAO_PRESETS[cfg.resolucao_preset].baseScale;
  const scale = cfg.escala_fonte * baseScale;
  const compact = cfg.densidade === "compacto";

  // Dados mock só pro preview (não bate no banco)
  const senhaAtual = { codigo: "A045", destino: "Consultório 02" };
  const proximas = [
    { codigo: "A046", fila: "Consulta", cor: cfg.cor_primaria },
    { codigo: "P012", fila: "Preferencial", cor: "#F59E0B" },
    { codigo: "E008", fila: "Exames", cor: "#10B981" },
    { codigo: "A047", fila: "Consulta", cor: cfg.cor_primaria },
  ];
  const ultimas = [
    { codigo: "A044", destino: "Cons. 01" },
    { codigo: "A043", destino: "Cons. 03" },
    { codigo: "P011", destino: "Cons. 02" },
  ];

  // Aspect ratio do preset (só visual — o preview ocupa largura total disponível)
  const aspect =
    cfg.resolucao_preset === "ultrawide"
      ? "21 / 9"
      : cfg.resolucao_preset === "uhd"
        ? "16 / 9"
        : "16 / 9";

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-muted/20">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Preview ao vivo
        </div>
        <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
          <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          {RESOLUCAO_PRESETS[cfg.resolucao_preset].label.split(" ")[0]} ·{" "}
          {Math.round(cfg.escala_fonte * 100)}% · {cfg.densidade}
        </div>
      </div>

      {/* Moldura "TV" com aspect ratio do preset */}
      <div className="bg-neutral-900 p-3 sm:p-4">
        <div
          className="relative w-full overflow-hidden rounded-lg shadow-2xl ring-1 ring-white/5"
          style={{ aspectRatio: aspect }}
        >
          {/* Tela em si */}
          <div
            className="absolute inset-0 flex flex-col"
            style={{
              backgroundColor: cfg.cor_fundo,
              backgroundImage: cfg.fundo_url ? `url(${cfg.fundo_url})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              color: cfg.cor_texto,
            }}
          >
            {cfg.fundo_url && (
              <div className="absolute inset-0 bg-black/45 pointer-events-none" />
            )}

            {/* Header */}
            <div
              className="relative flex items-center justify-between border-b border-white/10"
              style={{
                padding: `${(compact ? 6 : 10) * scale}px ${(compact ? 12 : 16) * scale}px`,
              }}
            >
              <div className="flex items-center" style={{ gap: `${8 * scale}px` }}>
                {cfg.logo_url ? (
                  <img
                    src={cfg.logo_url}
                    alt="logo"
                    className="object-contain"
                    style={{ height: `${22 * scale}px`, width: `${22 * scale}px` }}
                  />
                ) : (
                  <div
                    className="rounded"
                    style={{
                      backgroundColor: cfg.cor_primaria,
                      height: `${22 * scale}px`,
                      width: `${22 * scale}px`,
                    }}
                  />
                )}
                <div
                  className="font-bold uppercase tracking-[0.25em]"
                  style={{ fontSize: `${8 * scale}px`, color: cfg.cor_primaria }}
                >
                  Painel · Sua Clínica
                </div>
              </div>
              <div
                className="font-mono tabular-nums opacity-70"
                style={{ fontSize: `${10 * scale}px` }}
              >
                14:32
              </div>
            </div>

            {/* Corpo: senha em destaque + lateral */}
            <div
              className="relative flex flex-1 min-h-0"
              style={{ padding: `${(compact ? 8 : 14) * scale}px` }}
            >
              {/* Senha chamada */}
              <div className="flex flex-1 flex-col justify-center">
                <div
                  className="font-bold uppercase tracking-[0.3em] opacity-70"
                  style={{ fontSize: `${8 * scale}px`, color: cfg.cor_primaria }}
                >
                  Senha chamada
                </div>
                <div
                  className="font-display font-black leading-none tabular-nums"
                  style={{ fontSize: `${64 * scale}px`, marginTop: `${4 * scale}px` }}
                >
                  {senhaAtual.codigo}
                </div>
                <div
                  className="font-bold"
                  style={{
                    fontSize: `${16 * scale}px`,
                    marginTop: `${6 * scale}px`,
                    color: cfg.cor_primaria,
                  }}
                >
                  Dirija-se ao {senhaAtual.destino}
                </div>

                {/* Últimas chamadas */}
                <div style={{ marginTop: `${(compact ? 8 : 12) * scale}px` }}>
                  <div
                    className="font-bold uppercase tracking-[0.25em] opacity-50"
                    style={{ fontSize: `${7 * scale}px` }}
                  >
                    Últimas chamadas
                  </div>
                  <div
                    className="flex flex-wrap"
                    style={{ gap: `${6 * scale}px`, marginTop: `${4 * scale}px` }}
                  >
                    {ultimas.map((u) => (
                      <div
                        key={u.codigo}
                        className="rounded font-mono tabular-nums"
                        style={{
                          padding: `${3 * scale}px ${6 * scale}px`,
                          fontSize: `${9 * scale}px`,
                          backgroundColor: `${cfg.cor_primaria}22`,
                          color: cfg.cor_texto,
                        }}
                      >
                        {u.codigo}
                        <span className="opacity-60"> · {u.destino}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Lateral: aguardando */}
              <div
                className="flex flex-col rounded border border-white/10 bg-black/20 backdrop-blur-sm"
                style={{
                  width: `${130 * scale}px`,
                  marginLeft: `${10 * scale}px`,
                  padding: `${8 * scale}px`,
                }}
              >
                <div
                  className="font-bold uppercase tracking-[0.25em] opacity-70"
                  style={{ fontSize: `${7 * scale}px`, color: cfg.cor_primaria }}
                >
                  Aguardando
                </div>
                <div
                  className="flex flex-col"
                  style={{ gap: `${4 * scale}px`, marginTop: `${5 * scale}px` }}
                >
                  {proximas.map((p) => (
                    <div
                      key={p.codigo}
                      className="flex items-center justify-between rounded"
                      style={{
                        padding: `${3 * scale}px ${5 * scale}px`,
                        backgroundColor: `${p.cor}1f`,
                        borderLeft: `${2 * scale}px solid ${p.cor}`,
                      }}
                    >
                      <span
                        className="font-mono font-bold tabular-nums"
                        style={{ fontSize: `${10 * scale}px` }}
                      >
                        {p.codigo}
                      </span>
                      <span
                        className="opacity-60"
                        style={{ fontSize: `${7 * scale}px` }}
                      >
                        {p.fila}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pé da moldura — like a TV stand */}
        <div className="mx-auto mt-2 h-1.5 w-1/4 rounded-b-lg bg-neutral-800" />
      </div>
    </div>
  );
}
