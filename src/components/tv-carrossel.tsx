import { useEffect, useMemo, useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type SinalizacaoItem = {
  id: string;
  titulo: string;
  tipo: string; // "imagem" | "video" | texto livre
  url_midia: string | null;
  duracao_segundos: number;
  ordem: number;
  ativo: boolean;
  inicio_exibicao: string | null;
  fim_exibicao: string | null;
};

type Props = {
  unidadeId: string;
  /** Quando true, o carrossel pausa (ex.: enquanto há chamada destacada). */
  paused?: boolean;
  /** Classe extra para o wrapper externo. */
  className?: string;
};

/**
 * Verifica se um item está dentro da janela de exibição (inicio/fim opcionais).
 */
function dentroDaJanela(item: SinalizacaoItem, agora: Date): boolean {
  if (!item.ativo) return false;
  if (item.inicio_exibicao && new Date(item.inicio_exibicao) > agora) return false;
  if (item.fim_exibicao && new Date(item.fim_exibicao) < agora) return false;
  return true;
}

function isVideo(item: SinalizacaoItem): boolean {
  if (item.tipo?.toLowerCase().includes("video")) return true;
  const url = item.url_midia ?? "";
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

function isImage(item: SinalizacaoItem): boolean {
  if (item.tipo?.toLowerCase().includes("imagem") || item.tipo?.toLowerCase().includes("image")) {
    return true;
  }
  const url = item.url_midia ?? "";
  return /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(url);
}

export function TvCarrossel({ unidadeId, paused = false, className }: Props) {
  const [items, setItems] = useState<SinalizacaoItem[]>([]);
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState(() => new Date());

  // Carrega itens ativos da unidade + assina realtime
  useEffect(() => {
    if (!unidadeId) return;
    let mounted = true;
    void (async () => {
      const { data, error } = await supabase
        .from("sinalizacao_digital")
        .select(
          "id,titulo,tipo,url_midia,duracao_segundos,ordem,ativo,inicio_exibicao,fim_exibicao",
        )
        .eq("unidade_id", unidadeId)
        .eq("ativo", true)
        .order("ordem", { ascending: true });
      if (!mounted) return;
      if (error) {
        console.warn("[TV Carrossel] erro carregando sinalização:", error);
        return;
      }
      setItems((data ?? []) as SinalizacaoItem[]);
    })();

    const ch = supabase
      .channel(`tv:${unidadeId}:sinalizacao`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sinalizacao_digital",
          filter: `unidade_id=eq.${unidadeId}`,
        },
        (payload) => {
          setItems((prev) => {
            if (payload.eventType === "INSERT") {
              return [...prev, payload.new as SinalizacaoItem]
                .filter((i) => i.ativo)
                .sort((a, b) => a.ordem - b.ordem);
            }
            if (payload.eventType === "UPDATE") {
              const updated = payload.new as SinalizacaoItem;
              return prev
                .map((i) => (i.id === updated.id ? updated : i))
                .filter((i) => i.ativo)
                .concat(
                  prev.find((i) => i.id === updated.id) || !updated.ativo
                    ? []
                    : [updated],
                )
                .filter(
                  (i, idx, arr) => arr.findIndex((x) => x.id === i.id) === idx,
                )
                .sort((a, b) => a.ordem - b.ordem);
            }
            if (payload.eventType === "DELETE") {
              const old = payload.old as { id: string };
              return prev.filter((i) => i.id !== old.id);
            }
            return prev;
          });
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(ch);
    };
  }, [unidadeId]);

  // Atualiza relógio a cada minuto para reavaliar janelas de exibição
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Filtra itens elegíveis pelo horário atual
  const elegiveis = useMemo(
    () => items.filter((i) => dentroDaJanela(i, now)),
    [items, now],
  );

  // Garante que o índice fique dentro do range quando a lista muda
  useEffect(() => {
    if (elegiveis.length === 0) {
      if (index !== 0) setIndex(0);
      return;
    }
    if (index >= elegiveis.length) setIndex(0);
  }, [elegiveis.length, index]);

  const atual = elegiveis[index] ?? null;

  // Avança automaticamente após `duracao_segundos`
  // Para vídeos, esperamos o `onEnded` (com fallback de duração).
  const advance = () =>
    setIndex((i) => (elegiveis.length === 0 ? 0 : (i + 1) % elegiveis.length));

  useEffect(() => {
    if (paused || !atual) return;
    if (isVideo(atual)) {
      // Vídeo controla sua própria troca via onEnded; aplicamos timeout máximo
      // como segurança caso o vídeo falhe em emitir 'ended'.
      const max = Math.max(atual.duracao_segundos || 30, 5) * 1000;
      const t = setTimeout(advance, max + 2000);
      return () => clearTimeout(t);
    }
    const ms = Math.max(atual.duracao_segundos || 10, 3) * 1000;
    const t = setTimeout(advance, ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atual?.id, paused, elegiveis.length]);

  // Pausa/retoma vídeo conforme `paused`
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (paused) {
      v.pause();
    } else {
      void v.play().catch(() => {
        /* autoplay pode ser bloqueado; vídeo silencioso geralmente passa */
      });
    }
  }, [paused, atual?.id]);

  if (elegiveis.length === 0 || !atual) return null;

  return (
    <div
      className={
        "relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900 " +
        (className ?? "")
      }
    >
      {/* Mídia */}
      <div className="relative aspect-[16/9] w-full bg-black">
        {atual.url_midia && isImage(atual) && (
          <img
            key={atual.id}
            src={atual.url_midia}
            alt={atual.titulo}
            className="h-full w-full object-cover animate-fade-in"
            loading="eager"
            decoding="async"
            onError={() => advance()}
          />
        )}

        {atual.url_midia && isVideo(atual) && (
          <video
            key={atual.id}
            ref={videoRef}
            src={atual.url_midia}
            className="h-full w-full object-cover"
            autoPlay
            muted
            playsInline
            onEnded={advance}
            onError={() => advance()}
          />
        )}

        {(!atual.url_midia || (!isImage(atual) && !isVideo(atual))) && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-800 to-slate-900 p-8 text-center">
            {!atual.url_midia ? (
              <>
                <p className="font-display text-3xl font-bold text-white">
                  {atual.titulo}
                </p>
              </>
            ) : (
              <>
                <ImageOff className="h-10 w-10 text-slate-500" />
                <p className="text-sm text-slate-400">Mídia indisponível</p>
              </>
            )}
          </div>
        )}

        {/* Faixa inferior com título */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-5 py-4">
          <div className="flex items-end justify-between gap-3">
            <p className="font-display text-lg font-semibold text-white drop-shadow">
              {atual.titulo}
            </p>
            <span className="rounded-full border border-white/20 bg-black/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/80">
              {index + 1}/{elegiveis.length}
            </span>
          </div>
        </div>
      </div>

      {/* Indicador de progresso (linha de pontinhos) */}
      {elegiveis.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 border-t border-white/10 bg-slate-900/80 px-4 py-2">
          {elegiveis.map((it, i) => (
            <span
              key={it.id}
              className={`h-1 rounded-full transition-all ${
                i === index ? "w-6 bg-primary" : "w-1.5 bg-white/20"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
