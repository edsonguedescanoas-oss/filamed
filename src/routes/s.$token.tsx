import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, Megaphone, Clock, AlertCircle, QrCode as QrIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QrCode } from "@/components/qr-code";

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
type UnidadePub = { id: string; nome: string; slug: string };
type ChamadaPub = { id: string; destino: string; created_at: string };
type VisualPub = { logo_url: string | null };

export const Route = createFileRoute("/s/$token")({
  head: () => ({
    meta: [
      { title: "Acompanhe sua senha — FilaMed" },
      { name: "robots", content: "noindex" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1" },
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

  useEffect(() => {
    let mounted = true;
    void (async () => {
      // RPC pública: busca a própria senha por token, sem expor a tabela inteira ao anon
      const { data: rows, error: e } = await supabase
        .rpc("get_senha_por_token", { _token: token });
      const data = (rows ?? [])[0] ?? null;
      if (!mounted) return;
      if (e || !data) {
        setError("Senha não encontrada ou expirada.");
        setLoading(false);
        return;
      }
      setSenha(data as SenhaPub);

      const [fRes, uRows, vRes, cRes] = await Promise.all([
        supabase.from("filas").select("id,nome,cor,tempo_espera_estimado").eq("id", data.fila_id).maybeSingle(),
        supabase.rpc("get_unidades_publicas"),
        supabase.from("tv_visual_config").select("logo_url").eq("unidade_id", data.unidade_id).maybeSingle(),
        // chamadas dos últimos 60s da unidade — filtramos pela senha no cliente
        supabase.rpc("get_chamadas_recentes", { _unidade_id: data.unidade_id }),
      ]);
      if (!mounted) return;
      const uList = (uRows.data ?? []) as UnidadePub[];
      const u = uList.find((x) => x.id === data.unidade_id) ?? null;
      const cList = (cRes.data ?? []) as ChamadaPub[];
      const cMatch = cList.find((c) => (c as unknown as { senha_id: string }).senha_id === data.id) ?? null;
      setFila((fRes.data as FilaPub) ?? null);
      setUnidade(u);
      setVisual(vRes.data ?? null);
      setChamada(cMatch);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [token]);

  // Realtime: acompanha mudanças na própria senha
  useEffect(() => {
    if (!senha) return;
    const ch = supabase
      .channel(`pub:senha:${senha.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "senhas", filter: `id=eq.${senha.id}` },
        (payload) => {
          setSenha((prev) => ({ ...(prev as SenhaPub), ...(payload.new as SenhaPub) }));
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chamadas", filter: `senha_id=eq.${senha.id}` },
        (payload) => {
          setChamada(payload.new as ChamadaPub);
          // vibração leve quando for chamado
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            try {
              navigator.vibrate?.([200, 80, 200]);
            } catch {
              /* ignore */
            }
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [senha?.id]);

  // Conta quantas senhas estão na frente (mesma fila, criadas antes, ainda aguardando)
  useEffect(() => {
    if (!senha || senha.status !== "aguardando") {
      setAguardandoNaFrente(null);
      return;
    }
    let mounted = true;
    const refresh = async () => {
      const { count } = await supabase
        .from("senhas")
        .select("id", { count: "exact", head: true })
        .eq("fila_id", senha.fila_id)
        .eq("status", "aguardando")
        .lt("created_at", senha.created_at);
      if (mounted) setAguardandoNaFrente(count ?? 0);
    };
    void refresh();
    const t = setInterval(refresh, 15000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, [senha?.id, senha?.status, senha?.fila_id, senha?.created_at]);

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white px-5 py-8">
      <div className="mx-auto max-w-md">
        {unidade && (
          <div className="text-center text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">
            {unidade.nome}
          </div>
        )}
        <h1 className="text-center text-sm text-slate-300 mb-6">Acompanhe sua senha</h1>

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
                  <p className="text-sm text-slate-400">
                    {aguardandoNaFrente === 0
                      ? "Você é o próximo da fila."
                      : `${aguardandoNaFrente} ${aguardandoNaFrente === 1 ? "pessoa" : "pessoas"} na sua frente`}
                  </p>
                )}
              </div>
            )}

            {isFinalized && (
              <div className="inline-flex items-center gap-2 text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Atendimento finalizado</span>
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

        <p className="mt-6 text-center text-xs text-slate-500">
          Esta página atualiza automaticamente. Mantenha-a aberta.
        </p>
      </div>
    </div>
  );
}
