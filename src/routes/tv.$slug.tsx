import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, Users, Activity, Loader2, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTvVisualConfig } from "@/hooks/use-tv-visual-config";
import { cn } from "@/lib/utils";

// Tipagens básicas
type Senha = {
  id: string;
  codigo: string;
  status?: string;
  fila_nome?: string;
};

type Chamada = {
  id: string;
  senha_id: string;
  destino: string;
  created_at: string;
  senha?: Senha;
  // Campos vindos da nova RPC
  senha_codigo?: string;
  fila_nome?: string;
};

type TvSearchParams = {
  debug?: boolean;
};

export const Route = createFileRoute("/tv/$slug")({
  validateSearch: (search: Record<string, unknown>): TvSearchParams => {
    return {
      debug: search.debug === true || search.debug === "true",
    };
  },
  component: TvPage,
});

function TvPage() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const [unidade, setUnidade] = useState<any>(null);
  const [chamadas, setChamadas] = useState<Chamada[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [now, setNow] = useState(new Date());
  
  // Hook de configuração visual (cores, logo, etc)
  const { config: visual } = useTvVisualConfig(unidade?.id);

  // Relógio
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Busca inicial da unidade e chamadas recentes
  useEffect(() => {
    async function loadInitialData() {
      if (!slug) return;
      
      try {
        console.log("TV: Iniciando carga para slug:", slug);
        setLoading(true);
        setError(null);
        
        const { data: uniData, error: uniError } = await supabase
          .rpc("get_unidade_publica_by_slug", { _slug: slug });

        console.log("TV: Resposta unidade:", { uniData, uniError });

        if (uniError) throw uniError;
        if (!uniData || uniData.length === 0) {
          setError("Unidade não encontrada ou inativa.");
          setLoading(false);
          return;
        }

        const uni = uniData[0];
        setUnidade(uni);

        console.log("TV: Buscando chamadas para unidade:", uni.id);
        const { data: chamadasData, error: chamadasError } = await supabase
          .rpc("get_chamadas_recentes_detalhadas", { _unidade_id: uni.id });
        
        console.log("TV: Resposta chamadas:", { chamadasData, chamadasError });

        if (chamadasError) console.error("Erro ao buscar chamadas:", chamadasError);
        
        const mapeadas = (chamadasData ?? []).map(c => ({
          ...c,
          senha: {
            id: c.senha_id,
            codigo: c.senha_codigo,
            fila_nome: c.fila_nome
          }
        }));

        setChamadas(mapeadas as Chamada[]);
      } catch (err: any) {
        console.error("Erro fatal ao carregar TV:", err);
        setError(err.message || "Erro inesperado ao carregar o painel.");
      } finally {
        console.log("TV: Finalizando loading");
        setLoading(false);
      }
    }

    loadInitialData();
  }, [slug]);

  // Realtime para novas chamadas
  useEffect(() => {
    if (!unidade?.id) return;

    const channel = supabase
      .channel(`tv-realtime-${unidade.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chamadas",
          filter: `unidade_id=eq.${unidade.id}`,
        },
        async (payload) => {
          console.log("Nova chamada recebida:", payload.new);
          
          // Busca detalhes da senha para a nova chamada (mantido simples por enquanto)
          const { data: senhaData } = await supabase
            .from("senhas")
            .select("id, codigo, status, filas(nome)")
            .eq("id", payload.new.senha_id)
            .single();

          const novaChamada: Chamada = {
            ...(payload.new as Chamada),
            senha: {
              id: senhaData?.id as string,
              codigo: senhaData?.codigo as string,
              status: senhaData?.status as string,
              fila_nome: (senhaData?.filas as any)?.nome as string
            },
          };

          setChamadas(prev => [novaChamada, ...prev].slice(0, 10));
          
          const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
          audio.play().catch(() => console.log("Áudio bloqueado pelo navegador"));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [unidade?.id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-950 text-white p-10 text-center">
        <Activity className="h-16 w-16 text-destructive mb-6 opacity-50" />
        <h2 className="text-3xl font-bold mb-2">Ops! Algo deu errado.</h2>
        <p className="text-xl text-slate-400 max-w-md">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-8 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors font-semibold"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  const ultimaChamada = chamadas[0];
  const historico = chamadas.slice(1, 6);

  return (
    <div 
      className="flex h-screen flex-col overflow-hidden font-sans transition-colors duration-500"
      style={{ backgroundColor: visual.cor_fundo, color: visual.cor_texto }}
    >
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/10 bg-black/20 px-10 py-6">
        <div className="flex items-center gap-6">
          {visual.logo_url ? (
            <img src={visual.logo_url} alt="Logo" className="h-12 w-auto object-contain" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg">
              <Activity className="h-7 w-7 text-white" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{unidade?.nome}</h1>
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Conectado" />
            </div>
            <p className="text-sm font-medium opacity-60 uppercase tracking-widest">Painel de Chamadas</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-right">
            <p className="text-4xl font-mono font-bold">
              {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="text-sm font-medium opacity-60">
              {now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <button 
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
              } else {
                document.exitFullscreen();
              }
            }}
            className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            title="Tela Cheia"
          >
            <Activity className="h-6 w-6 opacity-40" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden">
        {/* Left Side: Current Call / Highlight */}
        <div className="flex-[2] flex flex-col items-center justify-center border-r border-white/10 p-10 bg-black/5">
          {ultimaChamada ? (
            <div className="w-full max-w-2xl animate-in fade-in zoom-in duration-500 text-center">
              <div 
                className="mb-8 inline-flex items-center gap-3 rounded-full bg-primary/20 px-6 py-2 text-primary border border-primary/30"
              >
                <Volume2 className="h-5 w-5 animate-pulse" />
                <span className="text-lg font-bold uppercase tracking-widest">Chamando Agora</span>
              </div>
              
              <div className="mb-4 text-[12rem] font-black leading-none tracking-tighter text-primary drop-shadow-2xl">
                {ultimaChamada.senha?.codigo}
              </div>
              
              <div className="mt-4 space-y-2">
                <p className="text-4xl font-medium opacity-60 uppercase tracking-widest">Favor dirigir-se</p>
                <p className="text-7xl font-bold uppercase">{ultimaChamada.destino}</p>
              </div>
            </div>
          ) : (
            <div className="text-center opacity-30">
              <Users className="mx-auto mb-6 h-32 w-32" />
              <p className="text-3xl font-medium uppercase tracking-widest">Aguardando Chamadas</p>
            </div>
          )}
        </div>

        {/* Right Side: History / Last Calls */}
        <div className="flex-1 flex flex-col bg-black/10">
          <div className="p-8 border-b border-white/10 bg-white/5">
            <h2 className="text-xl font-bold uppercase tracking-widest opacity-80 flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary" />
              Últimas Chamadas
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {historico.length > 0 ? (
              historico.map((chamada, idx) => (
                <div 
                  key={chamada.id}
                  className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-6 animate-in slide-in-from-right duration-300"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div>
                    <p className="text-4xl font-bold text-primary">{chamada.senha?.codigo}</p>
                    <p className="text-sm font-medium opacity-40 uppercase">{chamada.senha?.fila_nome || "Geral"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold opacity-80">{chamada.destino}</p>
                    <p className="text-xs font-mono opacity-30">
                      {new Date(chamada.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-full items-center justify-center opacity-20 italic">
                Nenhum histórico disponível
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer / Scrolling News or Info */}
      <footer className="h-16 flex items-center bg-primary px-10 text-primary-foreground font-bold overflow-hidden whitespace-nowrap">
        <div className="animate-marquee inline-block">
          {visual.mensagem_rodape || `Bem-vindo à ${unidade?.nome} • Por favor, acompanhe sua senha no painel • ${unidade?.nome} - Qualidade no atendimento`}
        </div>
      </footer>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
