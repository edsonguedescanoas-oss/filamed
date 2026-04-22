import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Clock, Users, Activity, Loader2, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTvVisualConfig } from "@/hooks/use-tv-visual-config";
import { cn } from "@/lib/utils";

// Tipagens básicas
type Senha = {
  id: string;
  codigo: string;
  status: string;
  paciente_nome?: string;
  fila_nome?: string;
  destino?: string;
};

type Chamada = {
  id: string;
  senha_id: string;
  destino: string;
  created_at: string;
  senha?: Senha;
};

export const Route = createFileRoute("/tv/$slug")({
  component: TvPage,
});

function TvPage() {
  const { slug } = useParams({ from: "/tv/$slug" });
  const [unidade, setUnidade] = useState<any>(null);
  const [chamadas, setChamadas] = useState<Chamada[]>([]);
  const [loading, setLoading] = useState(true);
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
      try {
        const { data: uniData, error: uniError } = await supabase
          .rpc("get_unidade_publica_by_slug", { _slug: slug });

        if (uniError || !uniData?.[0]) throw new Error("Unidade não encontrada");
        const uni = uniData[0];
        setUnidade(uni);

        const { data: chamadasData } = await supabase
          .rpc("get_chamadas_recentes", { _unidade_id: uni.id });
        
        setChamadas((chamadasData ?? []) as Chamada[]);
      } catch (err) {
        console.error("Erro ao carregar TV:", err);
      } finally {
        setLoading(false);
      }
    }

    if (slug) loadInitialData();
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
          
          // Busca detalhes da senha para a nova chamada
          const { data: senhaData } = await supabase
            .from("senhas")
            .select("id, codigo, status")
            .eq("id", payload.new.senha_id)
            .single();

          const novaChamada: Chamada = {
            ...(payload.new as Chamada),
            senha: senhaData as Senha,
          };

          setChamadas(prev => [novaChamada, ...prev].slice(0, 10));
          
          // Aqui poderíamos disparar um som ou animação
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
            <h1 className="text-2xl font-bold tracking-tight">{unidade?.nome}</h1>
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
      </header>

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
