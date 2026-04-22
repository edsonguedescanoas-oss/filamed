import { useEffect, useState } from "react";
import { Loader2, Monitor, Save, Eye, LayoutGrid, Bookmark, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  DEFAULT_TV_VISUAL,
  RESOLUCAO_PRESETS,
  type ContrasteChamadas,
  type Densidade,
  type ResolucaoPreset,
  type TvVisualConfig,
} from "@/hooks/use-tv-visual-config";
import { SinalizacaoManager } from "@/components/voz/sinalizacao-manager";
import { Switch } from "@/components/ui/switch";

interface Props {
  unidadeId: string;
  unidadeSlug: string | null;
}

export function TvAparenciaForm({ unidadeId, unidadeSlug }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cfg, setCfg] = useState<TvVisualConfig>(DEFAULT_TV_VISUAL);
  const [profiles, setProfiles] = useState<{ id: string; nome: string; config: any }[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [profileName, setProfileName] = useState("");

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from("tv_layout_profiles")
      .select("id, nome, config")
      .eq("unidade_id", unidadeId)
      .order("created_at", { ascending: false });
    if (data) setProfiles(data);
    setLoadingProfiles(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, [unidadeId]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const { data } = await supabase
        .from("tv_visual_config")
        .select(
          "cor_primaria,cor_fundo,cor_texto,logo_url,fundo_url,resolucao_preset,escala_fonte,densidade,mensagem_rodape,contraste_chamadas,escala_chamadas,escala_header,escala_rodape,layout_grid_cols,layout_grid_rows,layout_items,auto_ajuste,historico_limite,historico_quebrar_texto,aspect_ratio,zoom_nivel,safe_area_padding",
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
          contraste_chamadas:
            (data.contraste_chamadas as ContrasteChamadas) ?? "normal",
          escala_chamadas: Number(data.escala_chamadas) || 1,
          escala_header: Number(data.escala_header) || 1,
          escala_rodape: Number(data.escala_rodape) || 1,
          layout_grid_cols: Number(data.layout_grid_cols) || 12,
          layout_grid_rows: Number(data.layout_grid_rows) || 6,
          layout_items: (data.layout_items as any) || DEFAULT_TV_VISUAL.layout_items,
          auto_ajuste: !!data.auto_ajuste,
          historico_limite: Number(data.historico_limite) || 8,
          historico_quebrar_texto: !!data.historico_quebrar_texto,
          aspect_ratio: (data.aspect_ratio as any) ?? "16:9",
          zoom_nivel: Number(data.zoom_nivel) || 1.0,
          safe_area_padding: Number(data.safe_area_padding) || 0.0,
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

  const handleSave = async (customCfg?: TvVisualConfig) => {
    setSaving(true);
    const configToSave = customCfg || cfg;
    const { error } = await supabase
      .from("tv_visual_config")
      .upsert({ unidade_id: unidadeId, ...configToSave } as any, { onConflict: "unidade_id" });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    if (!customCfg) {
      toast.success("Aparência da TV salva!");
    }
  };

  const handleReset = () => setCfg(DEFAULT_TV_VISUAL);

  const handleSaveProfile = async () => {
    if (!profileName.trim()) {
      toast.error("Digite um nome para o perfil");
      return;
    }
    const { error } = await supabase.from("tv_layout_profiles").insert({
      unidade_id: unidadeId,
      nome: profileName,
      config: cfg as any,
    } as any);
    if (error) {
      toast.error("Erro ao salvar perfil");
      return;
    }
    
    // Aplicar imediatamente como solicitado
    await handleSave(cfg);
    
    toast.success("Perfil salvo e aplicado com sucesso!");
    setProfileName("");
    fetchProfiles();
  };

  const deleteProfile = async (id: string) => {
    const { error } = await supabase.from("tv_layout_profiles").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir perfil");
      return;
    }
    fetchProfiles();
  };

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
        <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="space-y-0.5">
            <Label className="text-sm font-semibold">Modo de Autoajuste</Label>
            <p className="text-xs text-muted-foreground">
              Calcula automaticamente a melhor escala e espaçamentos.
            </p>
          </div>
          <Switch
            checked={cfg.auto_ajuste}
            onCheckedChange={(v) => update("auto_ajuste", v)}
          />
        </div>

        <div className="flex flex-col justify-center gap-2 rounded-xl border border-border bg-card p-4">
          <Label className="text-sm font-semibold">Formato da Tela (Aspect Ratio)</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["16:9", "4:3"] as const).map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => update("aspect_ratio", ratio)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                  cfg.aspect_ratio === ratio
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                {ratio === "16:9" ? "Widescreen (16:9)" : "TV Antiga (4:3)"}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="escala" className="text-sm font-semibold">
              Escala de fonte ({Math.round(cfg.escala_fonte * 100)}%)
            </Label>
            <div className="flex gap-1">
              {[0.9, 0.95, 1.0, 1.05, 1.1].map((v) => (
                <Button
                  key={v}
                  type="button"
                  variant={Math.round(cfg.escala_fonte * 100) === Math.round(v * 100) ? "default" : "outline"}
                  size="sm"
                  className="h-7 px-2 text-[10px]"
                  onClick={() => update("escala_fonte", v)}
                >
                  {Math.round(v * 100)}%
                </Button>
              ))}
            </div>
          </div>
          <Input
            id="escala"
            type="range"
            min={0.5}
            max={1.5}
            step={0.01}
            value={cfg.escala_fonte}
            onChange={(e) => update("escala_fonte", Number(e.target.value))}
            className="h-6"
          />
          <p className="text-[11px] text-muted-foreground">
            Ajuste global do tamanho de tudo no painel. Use para evitar que o conteúdo transborde em sua TV.
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

      {/* Zoom e Safe Area */}
      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="zoom_nivel" className="text-sm font-semibold">
              Zoom Global ({Math.round(cfg.zoom_nivel * 100)}%)
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[10px]"
              onClick={() => update("zoom_nivel", 1.0)}
            >
              Resetar
            </Button>
          </div>
          <Input
            id="zoom_nivel"
            type="range"
            min={0.2}
            max={3.0}
            step={0.01}
            value={cfg.zoom_nivel}
            onChange={(e) => update("zoom_nivel", Number(e.target.value))}
            className="h-6"
          />
          <p className="text-[11px] text-muted-foreground">
            Aumenta ou diminui todo o conteúdo do painel. Útil para TVs com resoluções fora do padrão.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="safe_area_padding" className="text-sm font-semibold">
              Margem de Segurança (Safe Area: {Math.round(cfg.safe_area_padding * 100)}%)
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[10px]"
              onClick={() => update("safe_area_padding", 0.0)}
            >
              Resetar
            </Button>
          </div>
          <Input
            id="safe_area_padding"
            type="range"
            min={0}
            max={0.2}
            step={0.005}
            value={cfg.safe_area_padding}
            onChange={(e) => update("safe_area_padding", Number(e.target.value))}
            className="h-6"
          />
          <p className="text-[11px] text-muted-foreground">
            Adiciona um respiro nas bordas para evitar que o texto seja cortado em TVs com overscan.
          </p>
        </div>
      </section>

      {/* Legibilidade da área de chamadas */}
      <section className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
        <div>
          <Label className="text-sm font-semibold">
            Legibilidade da área de chamadas
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Para TVs em recepções com luz forte ou janelas grandes — aumenta o
            contraste e o tamanho das fontes só do painel de chamadas (não
            mexe nas mídias do carrossel).
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">Nível de contraste</Label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { v: "normal", titulo: "Normal", desc: "Usa o tema da TV" },
                { v: "alto", titulo: "Alto", desc: "Fundo escuro + texto claro" },
                { v: "maximo", titulo: "Máximo", desc: "Preto/branco + amarelo" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => update("contraste_chamadas", opt.v)}
                className={`rounded-lg border p-3 text-left transition-all ${
                  cfg.contraste_chamadas === opt.v
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="text-sm font-semibold">{opt.titulo}</div>
                <div className="text-[11px] text-muted-foreground">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="escala_header" className="text-xs font-medium">
              Fontes do Header ({Math.round(cfg.escala_header * 100)}%)
            </Label>
            <Input
              id="escala_header"
              type="range"
              min={0.5}
              max={2.0}
              step={0.05}
              value={cfg.escala_header}
              onChange={(e) => update("escala_header", Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="escala_chamadas" className="text-xs font-medium">
              Fontes da Chamada ({Math.round(cfg.escala_chamadas * 100)}%)
            </Label>
            <Input
              id="escala_chamadas"
              type="range"
              min={0.5}
              max={2.5}
              step={0.05}
              value={cfg.escala_chamadas}
              onChange={(e) => update("escala_chamadas", Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="escala_rodape" className="text-xs font-medium">
              Fontes do Rodapé ({Math.round(cfg.escala_rodape * 100)}%)
            </Label>
            <Input
              id="escala_rodape"
              type="range"
              min={0.5}
              max={2.0}
              step={0.05}
              value={cfg.escala_rodape}
              onChange={(e) => update("escala_rodape", Number(e.target.value))}
            />
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Ajuste as fontes individualmente para garantir legibilidade à distância sem quebrar o layout.
        </p>
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

      {/* Layout Grid */}
      <section className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
        <div>
          <Label className="text-sm font-semibold">Configuração do Grid de Layout</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Defina o número de colunas e linhas para organizar os elementos na tela.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="grid_cols" className="text-xs font-medium">Colunas ({cfg.layout_grid_cols})</Label>
            <Input
              id="grid_cols"
              type="number"
              min={1}
              max={24}
              value={cfg.layout_grid_cols}
              onChange={(e) => update("layout_grid_cols", Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="grid_rows" className="text-xs font-medium">Linhas ({cfg.layout_grid_rows})</Label>
            <Input
              id="grid_rows"
              type="number"
              min={1}
              max={12}
              value={cfg.layout_grid_rows}
              onChange={(e) => update("layout_grid_rows", Number(e.target.value))}
            />
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="hist_limite" className="text-xs font-medium">Itens no Histórico ({cfg.historico_limite})</Label>
            <Input
              id="hist_limite"
              type="number"
              min={1}
              max={20}
              value={cfg.historico_limite}
              onChange={(e) => update("historico_limite", Number(e.target.value))}
            />
            <p className="text-[10px] text-muted-foreground">Quantas chamadas anteriores mostrar na lista.</p>
          </div>
          <div className="flex items-center justify-between gap-4 pt-6">
            <div className="space-y-0.5">
              <Label className="text-xs font-medium">Quebrar texto no histórico</Label>
              <p className="text-[10px] text-muted-foreground">Evita cortar nomes longos.</p>
            </div>
            <Switch
              checked={cfg.historico_quebrar_texto}
              onCheckedChange={(v) => update("historico_quebrar_texto", v)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-xs font-medium">Organização dos Componentes</Label>
          <div className="space-y-4">
            {cfg.layout_items.map((item, idx) => (
              <div key={idx} className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
                <div className="flex-1 min-w-[150px] space-y-1.5">
                  <Label className="text-[10px] uppercase opacity-60">Tipo</Label>
                  <select
                    className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={item.type}
                    onChange={(e) => {
                      const newItems = [...cfg.layout_items];
                      newItems[idx] = { ...item, type: e.target.value as any };
                      update("layout_items", newItems);
                    }}
                  >
                    <option value="chamada_atual">Chamada Atual</option>
                    <option value="historico">Histórico</option>
                    <option value="midia">Mídia (Carrossel)</option>
                    <option value="relogio">Relógio Grande</option>
                  </select>
                </div>
                <div className="w-20 space-y-1.5">
                  <Label className="text-[10px] uppercase opacity-60">Col Span</Label>
                  <Input
                    type="number"
                    min={1}
                    max={cfg.layout_grid_cols}
                    className="h-8"
                    value={item.col_span}
                    onChange={(e) => {
                      const newItems = [...cfg.layout_items];
                      newItems[idx] = { ...item, col_span: Number(e.target.value) };
                      update("layout_items", newItems);
                    }}
                  />
                </div>
                <div className="w-20 space-y-1.5">
                  <Label className="text-[10px] uppercase opacity-60">Row Span</Label>
                  <Input
                    type="number"
                    min={1}
                    max={cfg.layout_grid_rows}
                    className="h-8"
                    value={item.row_span}
                    onChange={(e) => {
                      const newItems = [...cfg.layout_items];
                      newItems[idx] = { ...item, row_span: Number(e.target.value) };
                      update("layout_items", newItems);
                    }}
                  />
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-destructive"
                  onClick={() => {
                    const newItems = cfg.layout_items.filter((_, i) => i !== idx);
                    update("layout_items", newItems);
                  }}
                >
                  <span className="sr-only">Remover</span>
                  &times;
                </Button>
              </div>
            ))}
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full border-dashed"
              onClick={() => {
                const newItems = [
                  ...cfg.layout_items, 
                  { type: "midia", col_span: 4, row_span: 3, order: cfg.layout_items.length + 1 } as any
                ];
                update("layout_items", newItems);
              }}
            >
              + Adicionar Componente
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card/50 p-6">
        <div className="flex items-center gap-2">
          <Bookmark className="h-5 w-5 text-primary" />
          <h3 className="font-display text-lg font-bold">Perfis de Layout</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Salve as configurações atuais como um perfil ou escolha um perfil salvo para aplicar rapidamente.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="profileName">Nome do perfil</Label>
            <Input
              id="profileName"
              placeholder="Ex: Compacto, Noturno, Padrão..."
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={handleSaveProfile} className="gap-2">
            <Save className="h-4 w-4" />
            Salvar perfil
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg border bg-background p-3 transition-colors hover:border-primary/40"
            >
              <div className="flex flex-col overflow-hidden">
                <span className="truncate text-sm font-semibold">{p.nome}</span>
                <span className="text-[10px] text-muted-foreground">
                  {p.config.resolucao_preset?.toUpperCase()} • {p.config.densidade}
                </span>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const newCfg = { ...DEFAULT_TV_VISUAL, ...p.config };
                    setCfg(newCfg);
                    await handleSave(newCfg);
                    toast.info(`Perfil "${p.nome}" aplicado.`);
                  }}
                  className="h-8 text-xs text-primary hover:bg-primary/10"
                >
                  Aplicar
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteProfile(p.id)}
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {profiles.length === 0 && !loadingProfiles && (
            <div className="col-span-full py-4 text-center text-sm text-muted-foreground">
              Nenhum perfil salvo para esta unidade.
            </div>
          )}
        </div>
      </section>

      {/* Mídias do carrossel (imagem / vídeo / YouTube) */}
      <SinalizacaoManager unidadeId={unidadeId} />

      <section className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
        <Button onClick={() => handleSave()} disabled={saving} className="gap-2">
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
          {cfg.auto_ajuste ? "Auto" : `${Math.round(cfg.escala_fonte * 100)}%`} · {cfg.densidade}
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
                padding: `${(compact ? 6 : 10) * scale * cfg.escala_header}px ${(compact ? 12 : 16) * scale * cfg.escala_header}px`,
              }}
            >
              <div className="flex items-center" style={{ gap: `${8 * scale * cfg.escala_header}px` }}>
                {cfg.logo_url ? (
                  <img
                    src={cfg.logo_url}
                    alt="logo"
                    className="object-contain"
                    style={{ height: `${22 * scale * cfg.escala_header}px`, width: `${22 * scale * cfg.escala_header}px` }}
                  />
                ) : (
                  <div
                    className="rounded"
                    style={{
                      backgroundColor: cfg.cor_primaria,
                      height: `${22 * scale * cfg.escala_header}px`,
                      width: `${22 * scale * cfg.escala_header}px`,
                    }}
                  />
                )}
                <div
                  className="font-bold uppercase tracking-[0.25em]"
                  style={{ fontSize: `${8 * scale * cfg.escala_header}px`, color: cfg.cor_primaria }}
                >
                  Painel · Sua Clínica
                </div>
              </div>
              <div
                className="font-mono tabular-nums opacity-70"
                style={{ fontSize: `${10 * scale * cfg.escala_header}px` }}
              >
                14:32
              </div>
            </div>

            {/* Corpo com Grid Dinâmico */}
            <div
              className="relative flex-1 min-h-0 grid gap-1 p-1"
              style={{
                gridTemplateColumns: `repeat(${cfg.layout_grid_cols}, 1fr)`,
                gridTemplateRows: `repeat(${cfg.layout_grid_rows}, 1fr)`,
              }}
            >
              {cfg.layout_items.map((item, idx) => {
                const isCall = item.type === "chamada_atual";
                const isHist = item.type === "historico";
                const isMidia = item.type === "midia";
                const isRelogio = item.type === "relogio";

                return (
                  <div
                    key={idx}
                    className="flex flex-col items-center justify-center border border-white/5 bg-white/5 rounded relative overflow-hidden"
                    style={{
                      gridColumn: `span ${item.col_span}`,
                      gridRow: `span ${item.row_span}`,
                    }}
                  >
                    {isCall && (
                      <div className="text-center">
                        <div 
                          className="font-black leading-none text-primary"
                          style={{ fontSize: `${12 * scale * cfg.escala_chamadas}px` }}
                        >
                          {senhaAtual.codigo}
                        </div>
                        <div 
                          className="font-bold opacity-80"
                          style={{ fontSize: `${5 * scale}px` }}
                        >
                          {senhaAtual.destino}
                        </div>
                      </div>
                    )}

                    {isHist && (
                      <div className="w-full h-full flex flex-col">
                        <div 
                          className="bg-white/5 px-2 py-0.5 font-bold uppercase opacity-50"
                          style={{ fontSize: `${3 * scale}px` }}
                        >
                          Histórico
                        </div>
                        <div className="flex-1 p-1 space-y-0.5 overflow-hidden">
                          {ultimas.map((u, i) => (
                            <div key={i} className="flex justify-between items-center bg-white/5 rounded px-1">
                              <span className="font-bold text-primary" style={{ fontSize: `${4 * scale}px` }}>{u.codigo}</span>
                              <span className="opacity-60" style={{ fontSize: `${3 * scale}px` }}>{u.destino}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {isMidia && (
                      <div className="flex items-center justify-center bg-slate-800/50 w-full h-full text-[6px] italic opacity-30">
                        Espaço de Mídia
                      </div>
                    )}

                    {isRelogio && (
                      <div className="text-center">
                        <div className="font-mono font-bold" style={{ fontSize: `${10 * scale}px` }}>14:32</div>
                        <div className="opacity-40" style={{ fontSize: `${3 * scale}px` }}>terça-feira</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div
              className="relative flex items-center bg-primary text-primary-foreground overflow-hidden whitespace-nowrap"
              style={{ height: `${12 * scale * cfg.escala_rodape}px`, fontSize: `${6 * scale * cfg.escala_rodape}px`, padding: `0 ${8 * scale * cfg.escala_rodape}px` }}
            >
              <div className="font-bold">
                {cfg.mensagem_rodape || "Bem-vindo ao atendimento..."}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
