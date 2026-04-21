import { useEffect, useState } from "react";
import { Image as ImageIcon, Loader2, Plus, Save, Trash2, Video, Youtube } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

type TipoMidia = "imagem" | "video" | "youtube";

interface MidiaItem {
  id: string;
  titulo: string;
  tipo: string;
  url_midia: string | null;
  duracao_segundos: number;
  ordem: number;
  ativo: boolean;
}

interface Props {
  unidadeId: string;
}

/**
 * Gerencia os itens da `sinalizacao_digital`: imagens, vídeos e canais/vídeos
 * do YouTube exibidos em rotação no painel lateral da TV. Suporta criação,
 * edição inline (título/duração/ativo), reordenação por número e exclusão.
 */
export function SinalizacaoManager({ unidadeId }: Props) {
  const [items, setItems] = useState<MidiaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adicionando, setAdicionando] = useState(false);
  const [novoTipo, setNovoTipo] = useState<TipoMidia>("youtube");
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaUrl, setNovaUrl] = useState("");
  const [novaDuracao, setNovaDuracao] = useState(60);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const { data, error } = await supabase
        .from("sinalizacao_digital")
        .select("id,titulo,tipo,url_midia,duracao_segundos,ordem,ativo")
        .eq("unidade_id", unidadeId)
        .order("ordem", { ascending: true });
      if (!mounted) return;
      if (error) {
        toast.error("Erro ao carregar mídias: " + error.message);
        setLoading(false);
        return;
      }
      setItems((data ?? []) as MidiaItem[]);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [unidadeId]);

  const handleAdd = async () => {
    if (!novoTitulo.trim()) {
      toast.error("Informe um título.");
      return;
    }
    if ((novoTipo === "imagem" || novoTipo === "video" || novoTipo === "youtube") && !novaUrl.trim()) {
      toast.error("Informe a URL da mídia.");
      return;
    }
    setAdicionando(true);
    const ordem = items.length > 0 ? Math.max(...items.map((i) => i.ordem)) + 1 : 0;
    const { data, error } = await supabase
      .from("sinalizacao_digital")
      .insert({
        unidade_id: unidadeId,
        titulo: novoTitulo.trim(),
        tipo: novoTipo,
        url_midia: novaUrl.trim() || null,
        duracao_segundos: Math.max(3, novaDuracao),
        ordem,
        ativo: true,
      })
      .select("id,titulo,tipo,url_midia,duracao_segundos,ordem,ativo")
      .single();
    setAdicionando(false);
    if (error) {
      toast.error("Erro ao adicionar: " + error.message);
      return;
    }
    setItems((prev) => [...prev, data as MidiaItem]);
    setNovoTitulo("");
    setNovaUrl("");
    setNovaDuracao(novoTipo === "youtube" ? 60 : 10);
    toast.success("Mídia adicionada!");
  };

  const handleSave = async (item: MidiaItem) => {
    setSalvandoId(item.id);
    const { error } = await supabase
      .from("sinalizacao_digital")
      .update({
        titulo: item.titulo,
        url_midia: item.url_midia,
        duracao_segundos: item.duracao_segundos,
        ordem: item.ordem,
        ativo: item.ativo,
      })
      .eq("id", item.id);
    setSalvandoId(null);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Atualizado!");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover esta mídia do carrossel?")) return;
    const { error } = await supabase.from("sinalizacao_digital").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover: " + error.message);
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success("Removido.");
  };

  const updateLocal = <K extends keyof MidiaItem>(id: string, key: K, value: MidiaItem[K]) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [key]: value } : i)));
  };

  return (
    <section className="space-y-4 border-t border-border pt-6">
      <div>
        <h3 className="font-display text-base font-bold">Mídia do painel lateral</h3>
        <p className="text-xs text-muted-foreground">
          Imagens, vídeos e canais do YouTube que aparecem em rotação na área
          grande do painel. Pausa automaticamente enquanto há senha sendo
          chamada.
        </p>
      </div>

      {/* Form de adição */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo</Label>
            <div className="grid grid-cols-3 gap-1">
              {(["youtube", "imagem", "video"] as TipoMidia[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setNovoTipo(t)}
                  className={`flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium capitalize transition-colors ${
                    novoTipo === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  {t === "youtube" && <Youtube className="h-3.5 w-3.5" />}
                  {t === "imagem" && <ImageIcon className="h-3.5 w-3.5" />}
                  {t === "video" && <Video className="h-3.5 w-3.5" />}
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="novo-titulo" className="text-xs">
              Título
            </Label>
            <Input
              id="novo-titulo"
              placeholder={novoTipo === "youtube" ? "Ex.: Saúde no canal" : "Ex.: Banner promocional"}
              value={novoTitulo}
              onChange={(e) => setNovoTitulo(e.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="nova-url" className="text-xs">
              {novoTipo === "youtube"
                ? "URL do YouTube (vídeo, playlist ou ID)"
                : "URL da mídia"}
            </Label>
            <Input
              id="nova-url"
              placeholder={
                novoTipo === "youtube"
                  ? "https://youtube.com/watch?v=... ou https://youtube.com/playlist?list=..."
                  : "https://..."
              }
              value={novaUrl}
              onChange={(e) => setNovaUrl(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nova-duracao" className="text-xs">
              Duração (s)
            </Label>
            <Input
              id="nova-duracao"
              type="number"
              min={3}
              max={3600}
              className="w-24"
              value={novaDuracao}
              onChange={(e) => setNovaDuracao(Number(e.target.value) || 10)}
            />
          </div>
        </div>
        <Button onClick={handleAdd} disabled={adicionando} className="gap-2">
          {adicionando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Adicionar
        </Button>
      </div>

      {/* Lista de itens */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhuma mídia ainda. Adicione um vídeo do YouTube ou imagem acima.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                  {item.tipo === "youtube" ? (
                    <Youtube className="h-4 w-4" />
                  ) : item.tipo === "video" ? (
                    <Video className="h-4 w-4" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                </div>
                <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
                  <Input
                    value={item.titulo}
                    onChange={(e) => updateLocal(item.id, "titulo", e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    type="number"
                    min={0}
                    className="w-20 text-sm"
                    value={item.ordem}
                    onChange={(e) => updateLocal(item.id, "ordem", Number(e.target.value) || 0)}
                    title="Ordem"
                  />
                  <Input
                    type="number"
                    min={3}
                    className="w-24 text-sm"
                    value={item.duracao_segundos}
                    onChange={(e) =>
                      updateLocal(item.id, "duracao_segundos", Math.max(3, Number(e.target.value) || 10))
                    }
                    title="Duração (s)"
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={item.ativo}
                      onCheckedChange={(v) => updateLocal(item.id, "ativo", v)}
                    />
                    <span className="text-xs text-muted-foreground">Ativo</span>
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  value={item.url_midia ?? ""}
                  onChange={(e) => updateLocal(item.id, "url_midia", e.target.value || null)}
                  placeholder="URL da mídia"
                  className="text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSave(item)}
                  disabled={salvandoId === item.id}
                  className="gap-1.5"
                >
                  {salvandoId === item.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Salvar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(item.id)}
                  className="gap-1.5 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
