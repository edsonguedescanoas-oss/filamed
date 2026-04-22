import { useEffect, useMemo, useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type SinalizacaoItem = {
  id: string;
  titulo: string;
  tipo: string; // "imagem" | "video" | "youtube" | texto livre
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
  /** Esconde o rodapé de progresso (pontinhos) e o título sobreposto. */
  minimalChrome?: boolean;
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
  if (item.tipo?.toLowerCase()?.includes("video") && !isYoutube(item)) return true;
  const url = item.url_midia ?? "";
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

function isImage(item: SinalizacaoItem): boolean {
  if (item.tipo?.toLowerCase()?.includes("imagem") || item.tipo?.toLowerCase()?.includes("image")) {
    return true;
  }
  const url = item.url_midia ?? "";
  return /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(url);
}

function isYoutube(item: SinalizacaoItem): boolean {
  if (item.tipo?.toLowerCase()?.includes("youtube")) return true;
  const url = item.url_midia ?? "";
  return /(?:youtube\.com|youtu\.be)/i.test(url);
}

/**
 * Extrai o ID do vídeo / playlist do YouTube de várias formas de URL aceitas:
 *  - https://www.youtube.com/watch?v=VIDEO_ID
 *  - https://youtu.be/VIDEO_ID
 *  - https://www.youtube.com/embed/VIDEO_ID
 *  - https://www.youtube.com/playlist?list=PLAYLIST_ID
 *  - apenas o ID (11 chars alfanuméricos)
 *  - ID de playlist (começa com PL/UU/RD/OL e tem >13 chars)
 */
function parseYoutube(url: string | null | undefined): { videoId?: string; playlistId?: string; isHandle?: boolean } {
  if (!url) return {};
  const trimmed = url.trim();
  
  // Detecta URLs de canais/handles (não suportados diretamente no embed de vídeo)
  if (trimmed.includes("/@") || trimmed.startsWith("@") || trimmed.includes("/c/") || trimmed.includes("/channel/") || trimmed.includes("/user/")) {
    return { isHandle: true };
  }

  // Playlist explícita
  const listMatch = trimmed.match(/[?&]list=([A-Za-z0-9_-]+)/);
  const playlistId = listMatch?.[1];

  // Video ID em vários formatos
  let videoId: string | undefined;
  const watchMatch = trimmed.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  const shortMatch = trimmed.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  const embedMatch = trimmed.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/);
  const liveMatch = trimmed.match(/youtube\.com\/live\/([A-Za-z0-9_-]{11})/);
  const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/);
  const vMatch = trimmed.match(/youtube\.com\/v\/([A-Za-z0-9_-]{11})/);

  if (watchMatch) videoId = watchMatch[1];
  else if (shortMatch) videoId = shortMatch[1];
  else if (embedMatch) videoId = embedMatch[1];
  else if (liveMatch) videoId = liveMatch[1];
  else if (shortsMatch) videoId = shortsMatch[1];
  else if (vMatch) videoId = vMatch[1];
  else if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) videoId = trimmed;
  else if (/^(PL|UU|RD|OL|FL|LL)[A-Za-z0-9_-]{10,}$/.test(trimmed)) {
    // ID de playlist solto
    return { playlistId: trimmed };
  }

  return { videoId, playlistId };
}

/**
 * Monta a URL de embed do YouTube com autoplay mudo, em loop, sem controles
 * e sem informações relacionadas — ideal pra exibição em TV/painel.
 */
function buildYoutubeEmbed(url: string): string | null {
  const { videoId, playlistId } = parseYoutube(url);
  // Origem é exigida pelo YouTube IFrame API quando enablejsapi=1
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const base = "https://www.youtube-nocookie.com/embed";
  const common = [
    "autoplay=1",
    "mute=1",
    "controls=0",
    "modestbranding=1",
    "rel=0",
    "playsinline=1",
    "iv_load_policy=3",
    "disablekb=1",
    "fs=0",
    `enablejsapi=1`,
    origin ? `origin=${encodeURIComponent(origin)}` : "",
  ].filter(Boolean);

  if (playlistId) {
    // Playlist: o player precisa de listType + list. Para loop, basta omitir
    // — playlists do YouTube já reiniciam ao terminar.
    common.push(`listType=playlist`, `list=${playlistId}`);
    if (videoId) {
      return `${base}/${videoId}?${common.join("&")}`;
    }
    // Sem vídeo inicial — usa embed da playlist
    return `${base}/videoseries?${common.join("&")}`;
  }

  if (videoId) {
    // Vídeo único: loop precisa de `playlist=<videoId>` (peculiaridade do
    // YouTube — sem isso o `loop=1` é ignorado).
    common.push(`loop=1`, `playlist=${videoId}`);
    return `${base}/${videoId}?${common.join("&")}`;
  }

  return null;
}

export function TvCarrossel({ unidadeId, paused = false, className, minimalChrome = false }: Props) {
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
  // Para vídeos locais, esperamos o `onEnded` (com fallback de duração).
  // Para YouTube, sempre usamos timeout (não temos sinal de "ended" sem JS API).
  const advance = () =>
    setIndex((i) => (elegiveis.length === 0 ? 0 : (i + 1) % elegiveis.length));

  useEffect(() => {
    if (paused || !atual) return;
    if (isVideo(atual)) {
      const max = Math.max(atual.duracao_segundos || 30, 5) * 1000;
      const t = setTimeout(advance, max + 2000);
      return () => clearTimeout(t);
    }
    // YouTube e imagem: usam a duração configurada
    const ms = Math.max(atual.duracao_segundos || (isYoutube(atual) ? 60 : 10), 3) * 1000;
    const t = setTimeout(advance, ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atual?.id, paused, elegiveis.length]);

  // Pausa/retoma vídeo conforme `paused`
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const youtubeIframeRef = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      if (paused) v.pause();
      else void v.play().catch(() => {});
    }
    // YouTube: comanda via postMessage (IFrame API)
    const y = youtubeIframeRef.current;
    if (y && y.contentWindow) {
      const cmd = paused ? "pauseVideo" : "playVideo";
      y.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: cmd, args: [] }),
        "*",
      );
    }
  }, [paused, atual?.id]);

  if (elegiveis.length === 0 || !atual) return null;

  const youtubeEmbed = isYoutube(atual) && atual.url_midia ? buildYoutubeEmbed(atual.url_midia) : null;

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

        {youtubeEmbed && (
          <iframe
            key={atual.id}
            ref={youtubeIframeRef}
            src={youtubeEmbed}
            title={atual.titulo}
            className="absolute inset-0 h-full w-full border-0"
            // `allow` precisa autoplay + encrypted-media pra YouTube tocar sozinho.
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            // `sandbox` é omitido de propósito — o YouTube embed precisa de
            // origem confiável pra player rodar.
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}

        {(!atual.url_midia || (!isImage(atual) && !isVideo(atual) && !youtubeEmbed)) && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-800 to-slate-900 p-8 text-center">
            {!atual.url_midia ? (
              <p className="font-display text-3xl font-bold text-white">
                {atual.titulo}
              </p>
            ) : (
              <>
                <ImageOff className="h-10 w-10 text-slate-500" />
                <p className="text-sm text-slate-400 font-medium">Mídia indisponível</p>
                {parseYoutube(atual.url_midia).isHandle && (
                  <p className="text-[10px] text-slate-500 max-w-[280px] mt-1">
                    URLs de canais (@nome) não são suportadas. Use a URL de um vídeo ou playlist específica.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* Faixa inferior com título — escondida em modo minimalChrome (TV nova) */}
        {!minimalChrome && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-5 py-4 pointer-events-none">
            <div className="flex items-end justify-between gap-3">
              <p className="font-display text-lg font-semibold text-white drop-shadow">
                {atual.titulo}
              </p>
              <span className="rounded-full border border-white/20 bg-black/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/80">
                {index + 1}/{elegiveis.length}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Indicador de progresso (linha de pontinhos) */}
      {!minimalChrome && elegiveis.length > 1 && (
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
