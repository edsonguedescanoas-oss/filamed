import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { Loader2, CheckCircle2, Megaphone, Clock, AlertCircle, Star, BellRing, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { QrCode } from "@/components/qr-code";
import { useRealtimeTable } from "@/hooks/use-realtime-table";

type SenhaStatus =
  | "aguardando"
  | "chamada"
  | "em_atendimento"
  | "finalizada"
  | "ausente"
  | "cancelada";

type SenhaPub = {
  id: string;
  codigo: string;
  status: SenhaStatus;
  prioridade: "normal" | "preferencial" | "urgente";
  fila_id: string;
  unidade_id: string;
  created_at: string;
  updated_at: string;
};

type FilaPub = { id: string; nome: string; cor: string | null; tempo_espera_estimado: number };
type UnidadePub = { id: string; nome: string; slug: string; google_review_url?: string | null };
type ChamadaPub = { id: string; destino: string; created_at: string };
type VisualPub = { logo_url: string | null };

export const Route = createFileRoute("/s/$token")({
  head: () => ({
    meta: [
      { title: "Acompanhe sua Senha — FilaMed" },
      { name: "description", content: "Sua senha de atendimento está aqui. Acompanhe em tempo real e não perca sua vez!" },
      { name: "robots", content: "noindex" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1" },
      // Open Graph / Social Preview
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Sua Vez Está Chegando! 🎫" },
      { property: "og:description", content: "Clique para acompanhar sua senha de atendimento em tempo real. FilaMed: Cuidando do seu tempo." },
      { property: "og:image", content: "https://images.unsplash.com/photo-1584982324675-97613c161f65?q=80&w=1200&auto=format&fit=crop" },
      { property: "twitter:card", content: "summary_large_image" },
      { property: "twitter:title", content: "Sua Vez Está Chegando! 🎫" },
      { property: "twitter:description", content: "Acompanhe sua senha de atendimento em tempo real." },
      { property: "twitter:image", content: "https://images.unsplash.com/photo-1584982324675-97613c161f65?q=80&w=1200&auto=format&fit=crop" },
    ],
  }),
  component: PublicSenhaPage,
});

function PublicSenhaPage() {
  const { token } = useParams({ from: "/s/$token" });
  const [senha, setSenha] = useState<SenhaPub | null>(null);
  const [fila, setFila] = useState<FilaPub | null>(null);
  const [unidade, setUnidade] = useState<UnidadePub | null>(null);
  const [visual, setVisual] = useState<VisualPub | null>(null);
  const [chamada, setChamada] = useState<ChamadaPub | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aguardandoNaFrente, setAguardandoNaFrente] = useState<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  // Trava anti-duplicidade: guarda assinatura do último alerta + timestamp
  // para descartar reenvios do Realtime ou disparos por visibilitychange rápidos.
  const lastAlertRef = useRef<{ key: string; ts: number } | null>(null);
  // Persistência da ativação: usamos localStorage para não pedir de novo a
  // cada aba/refresh. A revalidação (abaixo) cuida de revogações no SO.
  const NOTIF_KEY = "ticket-notif-ativo";
  const computeAtivo = () => {
    if (typeof window === "undefined") return false;
    const flag = localStorage.getItem(NOTIF_KEY) === "1";
    if (!flag) return false;
    // Se o navegador suporta Notification e o usuário REVOGOU, não considere ativo.
    if ("Notification" in window && Notification.permission === "denied") {
      return false;
    }
    return true;
  };
  const [notificacoesAtivas, setNotificacoesAtivas] = useState<boolean>(computeAtivo);
  const [ativando, setAtivando] = useState(false);

  const fetchInitialData = useCallback(async (isRetry = false) => {
    // RPC pública: busca a própria senha por token, sem expor a tabela inteira ao anon
    const { data: rows, error: e } = await supabase
      .rpc("get_senha_por_token", { _token: token });
    
    const data = (rows ?? [])[0] ?? null;
    
    // Se não encontrou e for a primeira vez, tenta mais uma vez após 1s (evita race condition de record novo)
    if (!data && !isRetry) {
      await new Promise(r => setTimeout(r, 1000));
      return fetchInitialData(true);
    }

    if (e || !data) {
      setError("Senha não encontrada ou expirada.");
      setLoading(false);
      return;
    }

    const senhaData = data as SenhaPub;
    setSenha(senhaData);

    const [fRes, uRows, vRes, cRes] = await Promise.all([
      supabase.from("filas").select("id,nome,cor,tempo_espera_estimado").eq("id", senhaData.fila_id).maybeSingle(),
      supabase.rpc("get_unidade_publica_detalhe" as never, { _unidade_id: senhaData.unidade_id } as never),
      supabase.from("tv_visual_config").select("logo_url").eq("unidade_id", senhaData.unidade_id).maybeSingle(),
      // chamadas dos últimos 60s da unidade — filtramos pela senha no cliente
      supabase.rpc("get_chamadas_recentes", { _unidade_id: senhaData.unidade_id }),
    ]);

    const u = ((uRows.data as unknown as UnidadePub[] | null) ?? [])[0] ?? null;
    const cList = (cRes.data ?? []) as ChamadaPub[];
    const cMatch = cList.find((c) => (c as unknown as { senha_id: string }).senha_id === senhaData.id) ?? null;
    
    setFila((fRes.data as FilaPub) ?? null);
    setUnidade(u);
    setVisual(vRes.data ?? null);
    setChamada(cMatch);
    setLoading(false);
  }, [token]);

  // ---- helpers de notificação (som + vibração + Notification API) ----
  type AlertType = "next" | "called" | "finalized" | "warning";
  type AlertChannel = "sound" | "vibration" | "notification" | "visual";

  // Detecta suporte real à Vibration API (iOS Safari, por exemplo, não suporta)
  const supportsVibration = useCallback(() => {
    return (
      typeof navigator !== "undefined" &&
      typeof (navigator as Navigator).vibrate === "function"
    );
  }, []);

  const vibrate = useCallback(
    (pattern: number | number[]): boolean => {
      if (!supportsVibration()) return false;
      try {
        const ok = navigator.vibrate(pattern);
        // Alguns navegadores retornam false quando o gesto/visibilidade não permite
        return ok !== false;
      } catch {
        return false;
      }
    },
    [supportsVibration],
  );

  const logAlertChannels = useCallback(
    (type: AlertType, channels: AlertChannel[]) => {
      try {
        const entry = {
          ts: new Date().toISOString(),
          type,
          channels,
          vibrationSupported: supportsVibration(),
          notifPermission:
            typeof Notification !== "undefined" ? Notification.permission : "unsupported",
          visibility: typeof document !== "undefined" ? document.visibilityState : "n/a",
        };
        // Log no console para diagnóstico em campo
        console.info("[alertPaciente] canais utilizados:", entry);
        // Persiste últimos 20 eventos no localStorage
        const KEY = "ticket-alert-log";
        const raw = localStorage.getItem(KEY);
        const list: typeof entry[] = raw ? JSON.parse(raw) : [];
        list.push(entry);
        while (list.length > 20) list.shift();
        localStorage.setItem(KEY, JSON.stringify(list));
      } catch {
        /* ignore */
      }
    },
    [supportsVibration],
  );

  const playTone = useCallback(
    (freqs: Array<{ f: number; t: number; type?: OscillatorType }>): boolean => {
      try {
        const ctx =
          audioCtxRef.current ||
          new (window.AudioContext || (window as any).webkitAudioContext)();
        audioCtxRef.current = ctx;
        // Em alguns browsers o contexto fica "suspended" — retoma se possível
        if (ctx.state === "suspended") void ctx.resume();
        let cursor = ctx.currentTime;
        for (const { f, t, type } of freqs) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = type ?? "sine";
          osc.frequency.setValueAtTime(f, cursor);
          gain.gain.setValueAtTime(0.0001, cursor);
          gain.gain.exponentialRampToValueAtTime(0.18, cursor + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, cursor + t);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(cursor);
          osc.stop(cursor + t + 0.02);
          cursor += t + 0.04;
        }
        return ctx.state === "running";
      } catch (err) {
        console.warn("Erro ao tocar som:", err);
        return false;
      }
    },
    [],
  );

  const showNativeNotification = useCallback(
    (title: string, body: string): boolean => {
      try {
        if (typeof window === "undefined" || !("Notification" in window)) return false;
        if (Notification.permission !== "granted") return false;
        // Só dispara notificação nativa se a aba estiver oculta — caso contrário
        // o som + vibração + UI já alertam.
        if (document.visibilityState === "visible") return false;
        new Notification(title, {
          body,
          tag: "filamed-ticket",
          renotify: true,
          icon: "/favicon.ico",
        } as NotificationOptions);
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  const alertPaciente = useCallback(
    (type: AlertType, opts?: { title?: string; body?: string }) => {
      const channels: AlertChannel[] = [];
      let pattern: number | number[] = 200;
      let tones: Array<{ f: number; t: number; type?: OscillatorType }> = [];

      switch (type) {
        case "called":
          tones = [
            { f: 880, t: 0.18, type: "square" },
            { f: 660, t: 0.18, type: "square" },
            { f: 880, t: 0.22, type: "square" },
          ];
          pattern = [250, 100, 250, 100, 400];
          break;
        case "next":
          tones = [
            { f: 523, t: 0.14 },
            { f: 784, t: 0.18 },
          ];
          pattern = [180, 80, 180];
          break;
        case "finalized":
          tones = [
            { f: 660, t: 0.16 },
            { f: 880, t: 0.18 },
            { f: 1175, t: 0.28 },
          ];
          pattern = [120, 60, 120, 60, 300];
          break;
        case "warning":
          tones = [
            { f: 440, t: 0.2, type: "triangle" },
            { f: 330, t: 0.3, type: "triangle" },
          ];
          pattern = [400, 120, 400];
          break;
      }

      const soundOk = playTone(tones);
      if (soundOk) channels.push("sound");

      const vibrationOk = vibrate(pattern);
      if (vibrationOk) channels.push("vibration");

      let notifOk = false;
      if (opts?.title) notifOk = showNativeNotification(opts.title, opts.body ?? "");
      if (notifOk) channels.push("notification");

      // Aviso visual sempre ocorre — atua como fallback quando som/vibração falham.
      // Quando a vibração não está disponível, reforçamos o aviso visual com duração
      // maior para garantir que o paciente perceba a mudança.
      const visualTitle = opts?.title ?? "Atualização da sua senha";
      const visualBody = opts?.body;
      const noHaptics = !vibrationOk;
      const noSound = !soundOk;
      const reinforce = noHaptics || noSound;

      try {
        const fn =
          type === "warning" ? toast.warning : type === "finalized" ? toast.success : toast.info;
        fn(visualTitle, {
          description:
            visualBody ??
            (reinforce
              ? "Som/vibração indisponíveis neste dispositivo — fique atento à tela."
              : undefined),
          duration: reinforce ? 8000 : 4500,
        });
        channels.push("visual");
      } catch {
        /* ignore */
      }

      logAlertChannels(type, channels);
    },
    [playTone, vibrate, showNativeNotification, logAlertChannels],
  );

  // Mantido por compatibilidade com os pontos que já chamam playNotificationSound
  const playNotificationSound = useCallback(
    (type: "next" | "called") => alertPaciente(type),
    [alertPaciente],
  );

  // Ativação inicial: desbloqueia áudio (gesture) + pede permissão de notificação
  const ativarNotificacoes = useCallback(async () => {
    setAtivando(true);
    try {
      // 1) Cria/retoma AudioContext dentro do gesto do usuário (iOS/Safari)
      try {
        const ctx =
          audioCtxRef.current ||
          new (window.AudioContext || (window as any).webkitAudioContext)();
        audioCtxRef.current = ctx;
        if (ctx.state === "suspended") await ctx.resume();
        // beep silencioso só para "destravar" o output de áudio
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.02);
      } catch {
        /* ignore */
      }
      // 2) Vibração curta para "destravar" e confirmar suporte
      vibrate(40);
      // 3) Permissão de notificação — só pede uma vez
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "default") {
          try {
            await Notification.requestPermission();
          } catch {
            /* ignore */
          }
        }
      }
      localStorage.setItem(NOTIF_KEY, "1");
      setNotificacoesAtivas(true);
    } finally {
      setAtivando(false);
    }
  }, [vibrate]);

  useEffect(() => {
    void fetchInitialData();
  }, [fetchInitialData]);

  // Revalidação da permissão de Notificação (iOS/Android):
  // - quando a aba volta a ficar visível (usuário pode ter mudado em Configurações)
  // - via Permissions API (quando suportada) com listener nativo de mudança
  // Não pede permissão de novo aqui — só sincroniza o estado local com o real.
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    const sync = () => {
      const flag = localStorage.getItem(NOTIF_KEY) === "1";
      const denied = Notification.permission === "denied";
      // Se o usuário revogou no SO, força reabrir o gate.
      if (flag && denied) {
        localStorage.removeItem(NOTIF_KEY);
        setNotificacoesAtivas(false);
        return;
      }
      // Se já temos permissão concedida e a flag local existe, mantém ativo.
      // Se a flag sumiu mas a permissão é "granted" e o usuário já passou pelo
      // gate antes em outro dispositivo/navegador, NÃO reativamos sozinhos —
      // o gate exige um gesto para destravar áudio (iOS/Safari).
      if (flag && !denied && !notificacoesAtivas) {
        setNotificacoesAtivas(true);
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", sync);

    // Permissions API: alguns navegadores (Chrome Android, desktop) emitem
    // 'change' quando o usuário altera permissão sem recarregar a página.
    let permStatus: PermissionStatus | null = null;
    const setupPermObserver = async () => {
      try {
        const nav = navigator as Navigator & {
          permissions?: { query: (d: { name: PermissionName }) => Promise<PermissionStatus> };
        };
        if (!nav.permissions?.query) return;
        permStatus = await nav.permissions.query({ name: "notifications" as PermissionName });
        permStatus.addEventListener("change", sync);
      } catch {
        /* não suportado em alguns Safaris — ok */
      }
    };
    void setupPermObserver();

    // Sincroniza uma vez no mount (cobre Safari iOS sem Permissions API).
    sync();

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", sync);
      permStatus?.removeEventListener("change", sync);
    };
    // notificacoesAtivas intencionalmente fora das deps para evitar loop;
    // sync lê o valor atual e compara via setState (idempotente).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime: acompanha mudanças na própria senha e chamadas
  useEffect(() => {
    if (!senha) return;
    const ch = supabase
      .channel(`pub:senha:${senha.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "senhas", filter: `id=eq.${senha.id}` },
        (payload) => {
          const oldStatus = senha.status;
          const newStatus = payload.new.status as SenhaStatus;

          const nextSenha = payload.new as SenhaPub;
          setSenha((prev) => ({ ...(prev as SenhaPub), ...nextSenha }));
          if (nextSenha.fila_id !== senha.fila_id) {
            void supabase
              .from("filas")
              .select("id,nome,cor,tempo_espera_estimado")
              .eq("id", nextSenha.fila_id)
              .maybeSingle()
              .then(({ data }) => data && setFila(data as FilaPub));
            toast.info(`Sua senha foi atualizada para ${nextSenha.codigo}.`);
          } else if (oldStatus !== newStatus) {
            toast.info(statusMessage(newStatus));
          }

          // Alerta sonoro + vibração + notificação para CADA mudança de status
          if (oldStatus !== newStatus) {
            const codigo = nextSenha.codigo;
            switch (newStatus) {
              case "chamada":
                alertPaciente("called", {
                  title: "Você foi chamado!",
                  body: `Sua senha ${codigo} foi chamada. Dirija-se ao local indicado.`,
                });
                break;
              case "em_atendimento":
                alertPaciente("called", {
                  title: "Atendimento iniciado",
                  body: `Sua senha ${codigo} está em atendimento.`,
                });
                break;
              case "finalizada":
                alertPaciente("finalized", {
                  title: "Atendimento finalizado",
                  body: "Toque para avaliar a clínica.",
                });
                break;
              case "ausente":
              case "cancelada":
                alertPaciente("warning", {
                  title:
                    newStatus === "ausente"
                      ? "Marcado como ausente"
                      : "Senha cancelada",
                  body: `Sua senha ${codigo} foi ${newStatus === "ausente" ? "marcada como ausente" : "cancelada"}.`,
                });
                break;
            }
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chamadas", filter: `senha_id=eq.${senha.id}` },
        (payload) => {
          setChamada(payload.new as ChamadaPub);
          // Sempre alerta em rechamadas (mesmo se status já era "chamada")
          alertPaciente("called", {
            title: "Você foi chamado!",
            body: `Dirija-se a ${(payload.new as ChamadaPub).destino}.`,
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [senha?.id, alertPaciente]);

  // Na carga inicial, se já estiver chamado/em atendimento, dispara um alerta
  // (caso o paciente abra o link justamente nesse instante).
  const initialAlertSent = useRef(false);
  useEffect(() => {
    if (!notificacoesAtivas || !senha || initialAlertSent.current) return;
    if (senha.status === "chamada" || senha.status === "em_atendimento") {
      alertPaciente("called", {
        title: "Você foi chamado!",
        body: `Sua senha ${senha.codigo} já foi chamada.`,
      });
      initialAlertSent.current = true;
    } else if (senha.status === "finalizada") {
      alertPaciente("finalized", {
        title: "Atendimento finalizado",
        body: "Toque para avaliar a clínica.",
      });
      initialAlertSent.current = true;
    }
  }, [notificacoesAtivas, senha?.id, senha?.status, senha?.codigo, alertPaciente]);

  // CTA de avaliação só aparece DEPOIS do alerta sonoro/vibração para que o
  // paciente perceba a notificação primeiro e não seja levado direto a uma
  // ação visual antes de ouvir/sentir o aviso.
  const [showReviewCta, setShowReviewCta] = useState(false);
  useEffect(() => {
    if (senha?.status !== "finalizada") {
      setShowReviewCta(false);
      return;
    }
    // Atraso curto: tempo suficiente para o tom de finalização (~0.6s) e o
    // primeiro pulso de vibração serem percebidos antes do CTA aparecer.
    const t = setTimeout(() => setShowReviewCta(true), 900);
    return () => clearTimeout(t);
  }, [senha?.status]);

  // Conta quantas senhas estão na frente (mesma fila, criadas antes, ainda aguardando)
  const refreshPosition = useCallback(async () => {
    if (!senha || senha.status !== "aguardando") {
      setAguardandoNaFrente(null);
      return;
    }
    const { count } = await supabase
      .from("senhas")
      .select("id", { count: "exact", head: true })
      .eq("fila_id", senha.fila_id)
      .eq("status", "aguardando")
      .lt("created_at", senha.created_at);
    
    const newPos = count ?? 0;
    
    // Som se mudar para "você é o próximo" (pos 0)
    if (aguardandoNaFrente !== null && aguardandoNaFrente > 0 && newPos === 0) {
      playNotificationSound('next');
    }
    
    setAguardandoNaFrente(newPos);
  }, [senha?.id, senha?.status, senha?.fila_id, senha?.created_at, aguardandoNaFrente, playNotificationSound]);

  useEffect(() => {
    void refreshPosition();
  }, [refreshPosition]);

  // Realtime para atualizar posição IMEDIATAMENTE quando a fila anda
  useRealtimeTable({
    table: "senhas",
    filter: senha ? `fila_id=eq.${senha.fila_id}` : undefined,
    channelKey: `pub:fila:${senha?.fila_id}`,
    enabled: !!senha?.fila_id,
    onChange: () => {
      void refreshPosition();
    },
  });

  // Realtime para atualizar dados da fila (tempo estimado)
  useRealtimeTable({
    table: "filas",
    filter: senha ? `id=eq.${senha.fila_id}` : undefined,
    channelKey: `pub:fila_data:${senha?.fila_id}`,
    enabled: !!senha?.fila_id,
    onChange: async () => {
      const { data } = await supabase
        .from("filas")
        .select("id,nome,cor,tempo_espera_estimado")
        .eq("id", senha!.fila_id)
        .maybeSingle();
      if (data) setFila(data as FilaPub);
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !senha) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mb-3" />
        <h1 className="font-display text-xl font-bold mb-1">Senha não encontrada</h1>
        <p className="text-sm text-slate-400">{error ?? "Verifique o link."}</p>
        <Link to="/" className="mt-6 text-sm text-primary underline">
          Voltar
        </Link>
      </div>
    );
  }

  const isCalled = senha.status === "chamada" || senha.status === "em_atendimento";
  const isFinalized = senha.status === "finalizada";
  const isCancelled = senha.status === "cancelada" || senha.status === "ausente";

  // Gate inicial: pede ao paciente para "ativar notificações" — necessário
  // porque navegadores móveis exigem um gesto do usuário para liberar áudio,
  // vibração e Notification API.
  if (!notificacoesAtivas) {
    const isDenied =
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "denied";

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white px-5 py-8 flex items-center justify-center">
        <div className="mx-auto w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur p-7 text-center shadow-2xl">
          {visual?.logo_url ? (
            <img
              src={visual.logo_url}
              alt="Logo"
              className="mx-auto mb-5 max-h-14 w-auto object-contain"
            />
          ) : (
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <BellRing className="h-7 w-7" />
            </div>
          )}
          {unidade && (
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400 mb-1">
              {unidade.nome}
            </div>
          )}
          <h1 className="font-display text-2xl font-bold tracking-tight mb-2">
            Sua senha {senha.codigo}
          </h1>
          {isDenied ? (
            <>
              <p className="text-sm text-amber-200/90 leading-relaxed mb-4">
                As notificações estão <strong>bloqueadas</strong> nas
                configurações do navegador. Som e vibração ainda funcionam — você
                pode ativá-los abaixo.
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-6">
                Para receber alertas mesmo com a tela bloqueada, libere as
                notificações em <em>Configurações &gt; Site/Notificações</em> e
                volte a esta página.
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              Toque no botão abaixo para ativar <strong>som</strong>,{" "}
              <strong>vibração</strong> e <strong>notificações</strong> e ser
              avisado em tempo real quando for chamado.
            </p>
          )}
          <button
            type="button"
            onClick={() => void ativarNotificacoes()}
            disabled={ativando}
            className="w-full rounded-2xl bg-primary px-5 py-4 text-base font-bold text-primary-foreground shadow-xl shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {ativando ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <BellRing className="h-5 w-5" />
            )}
            {isDenied ? "Ativar som e vibração" : "Ativar notificações"}
          </button>
          <p className="mt-4 text-[11px] text-slate-500">
            Mantenha esta página aberta no celular para receber os avisos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white px-5 py-8">
      <div className="mx-auto max-w-md flex flex-col min-h-full">
        {visual?.logo_url && (
          <div className="mb-6 flex justify-center">
            <img src={visual.logo_url} alt="Logo" className="max-h-16 w-auto object-contain" />
          </div>
        )}
        
        {unidade && (
          <div className="text-center text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">
            {unidade.nome}
          </div>
        )}
        <h1 className="text-center text-sm text-slate-300 mb-6 font-display font-medium tracking-wide">
          Acompanhe sua senha em tempo real
        </h1>

        <div
          className={`rounded-3xl border p-8 text-center shadow-xl ${
            isCalled
              ? "border-primary/50 bg-primary/10 animate-pulse-soft"
              : isFinalized
                ? "border-emerald-500/40 bg-emerald-500/5"
                : isCancelled
                  ? "border-red-500/40 bg-red-500/5"
                  : "border-white/10 bg-slate-900"
          }`}
        >
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
            Sua senha
          </div>
          <div className="mt-3 font-display text-7xl font-black tracking-tight tabular-nums">
            {senha.codigo}
          </div>

          {fila && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: fila.cor ?? "#3B82F6" }}
              />
              {fila.nome}
            </div>
          )}

          <div className="mt-8">
            {isCalled && (
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-primary">
                  <Megaphone className="h-5 w-5" />
                  <span className="font-display text-lg font-bold uppercase">
                    {senha.status === "chamada" ? "Você foi chamado!" : "Em atendimento"}
                  </span>
                </div>
                {chamada?.destino && (
                  <div>
                    <div className="text-xs uppercase tracking-wider text-slate-400">
                      Dirija-se a
                    </div>
                    <div className="font-display text-3xl font-bold text-primary">
                      {chamada.destino}
                    </div>
                  </div>
                )}
              </div>
            )}

            {senha.status === "aguardando" && (
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-slate-300">
                  <Clock className="h-5 w-5" />
                  <span className="font-medium">Aguardando chamada</span>
                </div>
                {aguardandoNaFrente !== null && (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-400">
                      {aguardandoNaFrente === 0
                        ? "Você é o próximo da fila."
                        : `${aguardandoNaFrente} ${aguardandoNaFrente === 1 ? "pessoa" : "pessoas"} na sua frente`}
                    </p>
                    
                    {fila?.tempo_espera_estimado && aguardandoNaFrente > 0 && (
                      <div className="rounded-2xl bg-white/5 border border-white/10 p-4 mt-4">
                        <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">Expectativa de espera</div>
                        <div className="text-2xl font-display font-bold text-primary">
                          ~{aguardandoNaFrente * fila.tempo_espera_estimado} min
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {isFinalized && (
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 text-emerald-300">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Atendimento finalizado</span>
                </div>
                {unidade?.google_review_url && (
                  <div
                    className={`flex flex-col items-center gap-2 transition-all duration-500 ${
                      showReviewCta
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-2 pointer-events-none"
                    }`}
                    aria-hidden={!showReviewCta}
                  >
                    <p className="text-xs text-slate-400">
                      Sua opinião ajuda muito 💛
                    </p>
                    <a
                      href={unidade.google_review_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group mx-auto flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-base font-bold text-primary-foreground shadow-xl shadow-primary/30 ring-2 ring-primary/40 ring-offset-2 ring-offset-slate-900 transition-all hover:scale-[1.02] active:scale-[0.98] animate-pulse-soft"
                    >
                      <Star className="h-5 w-5 fill-current" />
                      <span className="underline underline-offset-4 decoration-2 decoration-primary-foreground/70">
                        Avalie aqui
                      </span>
                      <ExternalLink className="h-4 w-4 opacity-80 group-hover:translate-x-0.5 transition-transform" />
                    </a>
                    <p className="text-[10px] text-slate-500 inline-flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      Abre o Google Avaliações em nova aba
                    </p>
                  </div>
                )}
              </div>
            )}

            {isCancelled && (
              <div className="inline-flex items-center gap-2 text-red-300">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">
                  {senha.status === "ausente" ? "Marcado como ausente" : "Senha cancelada"}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center">
          <div className="bg-white p-3 rounded-2xl shadow-xl">
            <QrCode 
              value={typeof window !== 'undefined' ? window.location.href : ''} 
              size={120} 
              className="mx-auto"
            />
          </div>
          <p className="mt-4 text-center text-xs text-slate-500 max-w-[200px]">
            Escaneie o QR Code ou mantenha esta página aberta para acompanhar sua chamada.
          </p>
        </div>

        <p className="mt-auto pt-10 pb-6 text-center text-[10px] uppercase tracking-widest text-slate-600">
          Powered by FilaMed
        </p>
      </div>
    </div>
  );
}

function statusMessage(status: SenhaStatus): string {
  const map: Record<SenhaStatus, string> = {
    aguardando: "Sua senha voltou para a fila de espera.",
    chamada: "Você foi chamado. Verifique o local indicado.",
    em_atendimento: "Seu atendimento começou.",
    finalizada: "Seu atendimento foi finalizado.",
    ausente: "Sua senha foi marcada como ausente.",
    cancelada: "Sua senha foi cancelada.",
  };
  return map[status];
}
