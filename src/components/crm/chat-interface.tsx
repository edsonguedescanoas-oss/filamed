import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Send, 
  User,
  Phone, 
  Calendar,
  CheckCircle2,
  Clock,
  ChevronRight,
  UserPlus,
  MessageSquare,
  Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useInView } from "react-intersection-observer";

const safeFormat = (date: any, formatStr: string) => {
  if (!date) return "";
  const d = new Date(date);
  if (!isValid(d)) return "";
  return format(d, formatStr, { locale: ptBR });
};

// Sub-componente memoizado para cada item da lista de conversas
const ConversationItem = React.memo(({ conversa, isSelected, onSelect }: any) => {
  return (
    <button
      onClick={() => onSelect(conversa.id)}
      className={cn(
        "w-full p-4 flex gap-4 text-left transition-all duration-200 outline-none focus-visible:bg-muted/80",
        isSelected 
          ? "bg-accent/40 shadow-[inset_4px_0_0_0_var(--primary)]" 
          : "hover:bg-muted/40 active:bg-muted/60"
      )}
      aria-selected={isSelected}
    >
      <div className="relative shrink-0">
        <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
          <AvatarFallback className="bg-gradient-primary text-primary-foreground font-bold">
            {conversa.contato?.nome?.[0] || "C"}
          </AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-success" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-bold text-sm truncate text-foreground group-hover:text-primary transition-colors">
            {conversa.contato?.nome || "Sem Nome"}
          </span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
            {conversa.ultima_mensagem_at && safeFormat(conversa.ultima_mensagem_at, "HH:mm")}
          </span>
        </div>
        <p className="text-xs text-muted-foreground/80 truncate leading-normal">
          {conversa.ultima_mensagem_preview || "Nenhuma mensagem enviada"}
        </p>
        <div className="mt-2 flex items-center gap-2">
           <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-bold uppercase tracking-wider bg-muted/60">
            {conversa.status}
           </Badge>
           {conversa.agente && (
             <span className="text-[9px] text-muted-foreground font-medium flex items-center gap-1">
               <User className="h-2.5 w-2.5 opacity-60" />
               {conversa.agente.nome}
             </span>
           )}
        </div>
      </div>
    </button>
  );
});

ConversationItem.displayName = "ConversationItem";


export function ChatInterface() {
  const queryClient = useQueryClient();
  const [selectedConversaId, setSelectedConversaId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // No mobile, se selecionou uma conversa, esconde a sidebar automaticamente
  useEffect(() => {
    if (selectedConversaId && window.innerWidth < 768) {
      setShowSidebar(false);
    }
  }, [selectedConversaId]);

  // 1. Carregar conversas com paginação infinita
  const { 
    data: conversasData, 
    isLoading: loadingConversas,
    fetchNextPage: fetchNextConversas,
    hasNextPage: hasNextConversas,
    isFetchingNextPage: isFetchingNextConversas
  } = useInfiniteQuery({
    queryKey: ["crm_conversas"],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const pageSize = 20;
      const { data, error } = await supabase
        .from("crm_conversas")
        .select(`
          *,
          contato:crm_contatos(*),
          agente:crm_agentes(id, nome)
        `)
        .order("ultima_mensagem_at", { ascending: false })
        .range(pageParam, pageParam + pageSize - 1);
        
      if (error) throw error;
      return data;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || lastPage.length < 20) return undefined;
      return allPages.length * 20;
    },
  });

  const conversas = useMemo(() => 
    conversasData?.pages.flat() || [], 
    [conversasData]
  );

  const selectedConversa = useMemo(() => 
    conversas?.find(c => c.id === selectedConversaId), 
    [conversas, selectedConversaId]
  );

  // 2. Carregar mensagens da conversa selecionada com paginação infinita (histórico)
  const { 
    data: mensagensData, 
    isLoading: loadingMensagens,
    fetchNextPage: fetchNextMensagens,
    hasNextPage: hasNextMensagens,
    isFetchingNextPage: isFetchingNextMensagens
  } = useInfiniteQuery({
    queryKey: ["crm_mensagens", selectedConversaId],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      if (!selectedConversaId) return [];
      const pageSize = 30;
      const { data, error } = await supabase
        .from("crm_mensagens")
        .select("*")
        .eq("conversa_id", selectedConversaId)
        .order("created_at", { ascending: false }) // Buscamos as mais recentes primeiro para o chat
        .range(pageParam, pageParam + pageSize - 1);
        
      if (error) throw error;
      return data;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || lastPage.length < 30) return undefined;
      return allPages.length * 30;
    },
    enabled: !!selectedConversaId,
  });

  const mensagens = useMemo(() => {
    const allMsgs = mensagensData?.pages.flat() || [];
    return [...allMsgs].reverse(); // Revertemos para exibir cronologicamente no chat
  }, [mensagensData]);

  const { ref: loadMoreMsgsRef, inView: moreMsgsInView } = useInView();

  useEffect(() => {
    if (moreMsgsInView && hasNextMensagens && !isFetchingNextMensagens) {
      void fetchNextMensagens();
    }
  }, [moreMsgsInView, hasNextMensagens, isFetchingNextMensagens, fetchNextMensagens]);

  // Realtime updates para mensagens
  useEffect(() => {
    if (!selectedConversaId) return;

    const channel = supabase
      .channel(`crm_mensagens_${selectedConversaId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "crm_mensagens",
          filter: `conversa_id=eq.${selectedConversaId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["crm_mensagens", selectedConversaId] });
          void queryClient.invalidateQueries({ queryKey: ["crm_conversas"] });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [selectedConversaId, queryClient]);

  // Auto-scroll para o fim
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens]);

  // Mutation para enviar mensagem
  const sendMutation = useMutation({
    mutationFn: async ({ text }: { text: string }) => {
      if (!selectedConversaId || !selectedConversa) return;

      // 1. Salvar no banco (como saída)
      const { data: msg, error: msgErr } = await supabase
        .from("crm_mensagens")
        .insert({
          conversa_id: selectedConversaId,
          conteudo: text,
          direcao: "saida",
          tipo: "whatsapp"
        })
        .select()
        .single();

      if (msgErr) throw msgErr;

      // 2. Chamar Edge Function para enviar via WaDuck
      // Precisamos da config do WaDuck. Para o CRM do SuperAdmin, 
      // podemos usar uma config global ou a da unidade do contato.
      const unidadeId = selectedConversa.contato?.unidade_id;
      
      const { error: sendErr } = await supabase.functions.invoke("wa-duck-notify", {
        body: {
          tipo: "teste", // Usamos 'teste' porque permite passar telefone e mensagem arbitrária
          unidade_id: unidadeId,
          telefone: selectedConversa.contato?.telefone,
          mensagem: text
        }
      });

      if (sendErr) {
        console.error("Erro ao enviar via WaDuck:", sendErr);
        // Marcamos como falha no log local?
      }

      return msg;
    },
    onSuccess: () => {
      setMessageText("");
      void queryClient.invalidateQueries({ queryKey: ["crm_mensagens", selectedConversaId] });
      void queryClient.invalidateQueries({ queryKey: ["crm_conversas"] });
    },
    onError: (err) => {
       toast.error("Erro ao enviar mensagem: " + (err as any).message);
    }
  });

  const handleSend = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (!messageText.trim() || sendMutation.isPending) return;
    sendMutation.mutate({ text: messageText });
  }, [messageText, sendMutation, selectedConversaId]);

  return (
    <div className="flex h-[calc(100vh-64px)] bg-background overflow-hidden relative w-full">
      {/* Sidebar - Lista de Conversas */}
      <div className={cn(
        "absolute inset-0 z-20 bg-background md:relative md:flex md:inset-auto w-full md:w-80 lg:w-96 border-r flex-col shrink-0 transition-all duration-300 ease-in-out",
        !showSidebar && "-translate-x-full md:translate-x-0 opacity-0 md:opacity-100 pointer-events-none md:pointer-events-auto"
      )}>
        <div className="p-4 space-y-4 border-b bg-background/95 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-xl tracking-tight text-foreground">Conversas</h2>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted" aria-label="Filtrar">
                <Filter className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full md:hidden hover:bg-muted" onClick={() => setShowSidebar(false)} aria-label="Fechar menu">
                <ChevronRight className="h-4 w-4 rotate-180" />
              </Button>
            </div>
          </div>
          <div className="relative group">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Buscar por nome ou telefone..." 
              className="pl-9 h-10 bg-muted/30 border-none focus-visible:ring-2 focus-visible:ring-primary/20 rounded-xl text-sm" 
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="divide-y divide-border/40 pb-20 md:pb-0">
            {loadingConversas ? (
              <div className="flex flex-col items-center justify-center p-12 gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-sm font-medium">Carregando conversas...</span>
              </div>
            ) : conversas.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 gap-3 text-muted-foreground text-center">
                <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center mb-2">
                  <MessageSquare className="h-8 w-8 opacity-20" />
                </div>
                <span className="text-sm font-medium">Nenhuma conversa encontrada.</span>
                <p className="text-xs max-w-[200px]">Inicie uma conversa ou aguarde o recebimento de mensagens.</p>
              </div>
            ) : (
              <>
                {conversas.map((conversa: any) => (
                  <ConversationItem 
                    key={conversa.id}
                    conversa={conversa}
                    isSelected={selectedConversaId === conversa.id}
                    onSelect={setSelectedConversaId}
                  />
                ))}
                {hasNextConversas && (
                  <div className="p-4 flex justify-center">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => fetchNextConversas()}
                      disabled={isFetchingNextConversas}
                      className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
                    >
                      {isFetchingNextConversas ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                      {isFetchingNextConversas ? "Buscando..." : "Ver mais conversas"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col overflow-hidden min-w-0 bg-gradient-mesh transition-all duration-300",
        showSidebar && "opacity-50 md:opacity-100"
      )}>
        {selectedConversa ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-4 border-b flex items-center justify-between bg-background/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-3 min-w-0">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 md:hidden shrink-0" 
                  onClick={() => setShowSidebar(true)}
                  aria-label="Voltar para lista"
                >
                  <ChevronRight className="h-5 w-5 rotate-180" />
                </Button>
                <Avatar className="h-10 w-10 border-2 border-background shadow-sm shrink-0">
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground font-bold">
                    {selectedConversa.contato?.nome?.[0] || "C"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm truncate leading-tight">{selectedConversa.contato?.nome}</h3>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                    <div className="h-1.5 w-1.5 rounded-full bg-success" />
                    Ativo agora
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" className="hidden sm:flex h-8 gap-2 text-[10px] font-bold uppercase tracking-wider rounded-full border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Finalizar
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="Mais opções">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20"
            >
              {loadingMensagens ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <>
                  {hasNextMensagens && (
                    <div ref={loadMoreMsgsRef} className="flex justify-center p-2">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {mensagens.map((msg: any) => {
                    const isSystem = msg.tipo === "sistema" || msg.tipo === "nota";
                    const isOut = msg.direcao === "saida";
                    
                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center">
                          <span className="text-[10px] bg-muted px-2 py-1 rounded-full text-muted-foreground uppercase tracking-wider font-semibold">
                            {msg.conteudo}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div 
                        key={msg.id} 
                        className={cn(
                          "flex max-w-[80%]",
                          isOut ? "ml-auto flex-row-reverse" : "mr-auto"
                        )}
                      >
                        <div className={cn(
                          "group relative px-4 py-2.5 rounded-2xl text-[13.5px] shadow-sm transition-all hover:shadow-md",
                          isOut 
                            ? "bg-primary text-primary-foreground rounded-tr-none shadow-primary/10" 
                            : "bg-background border border-border/60 rounded-tl-none"
                        )}>
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.conteudo}</p>
                          <div className={cn(
                            "mt-1.5 flex items-center gap-1.5 text-[10px] font-medium",
                            isOut ? "text-primary-foreground/70 justify-end" : "text-muted-foreground"
                          )}>
                            {safeFormat(msg.created_at, "HH:mm")}
                            {isOut && (
                              <span className="flex items-center gap-0.5" aria-hidden="true">
                                 {msg.wa_status === "read" ? "✓✓" : "✓"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t bg-background">
              <form onSubmit={handleSend} className="flex items-end gap-2 max-w-4xl mx-auto">
                <div className="flex-1">
                  <textarea
                    rows={1}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Digite sua mensagem..."
                    className="w-full bg-muted/50 border-none focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm resize-none"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={!messageText.trim() || sendMutation.isPending}
                  size="icon" 
                  className="rounded-full h-10 w-10 shrink-0"
                >
                  {sendMutation.isPending ? (
                    <Clock className="h-4 w-4 animate-pulse" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-4">
            <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center">
              <MessageSquare className="h-10 w-10" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-lg text-foreground">Sua Caixa de Entrada</h3>
              <p className="max-w-xs mx-auto">Selecione uma conversa ao lado para começar o atendimento.</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - Contact Info */}
      {selectedConversa && (
        <div className="w-80 border-l hidden lg:flex flex-col shrink-0 bg-muted/5">
          <div className="p-6 flex flex-col items-center text-center space-y-4">
            <Avatar className="h-20 w-20 border-2 border-background shadow-lg">
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                 {selectedConversa.contato?.nome?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-bold text-lg">{selectedConversa.contato?.nome}</h3>
              <p className="text-sm text-muted-foreground">{selectedConversa.contato?.telefone}</p>
            </div>
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1 text-xs" size="sm">
                Editar
              </Button>
              <Button variant="outline" className="flex-1 text-xs" size="sm">
                Bloquear
              </Button>
            </div>
          </div>

          <Separator />

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              <section className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Informações</h4>
                <div className="space-y-2">
                   <div className="flex items-center gap-3 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Primeiro contato</p>
                        <p className="text-xs text-muted-foreground">
                            {selectedConversa.contato?.created_at 
                            ? safeFormat(selectedConversa.contato.created_at, "PPP")
                            : "N/A"}
                        </p>
                      </div>
                   </div>
                   <div className="flex items-center gap-3 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Última interação</p>
                        <p className="text-xs text-muted-foreground">
                            {selectedConversa.ultima_mensagem_at
                            ? safeFormat(selectedConversa.ultima_mensagem_at, "PPp")
                            : "N/A"}
                        </p>
                      </div>
                   </div>
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Atribuição</h4>
                <div className="flex items-center justify-between p-2 rounded-lg bg-background border border-dashed text-sm">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedConversa.agente?.nome || "Não atribuído"}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Unidade Relacionada</h4>
                {selectedConversa.contato?.unidade_id ? (
                   <div className="p-3 rounded-lg bg-background border text-xs">
                      <p className="font-bold text-primary mb-1">ID da Unidade</p>
                      <p className="font-mono text-[10px]">{selectedConversa.contato.unidade_id}</p>
                   </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Nenhuma unidade vinculada.</p>
                )}
              </section>
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

// O componente ConversationItem foi movido para o topo do arquivo para evitar problemas de hoisting com const.
