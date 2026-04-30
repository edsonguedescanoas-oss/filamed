import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  MessageSquare
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ChatInterface() {
  const queryClient = useQueryClient();
  const [selectedConversaId, setSelectedConversaId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Carregar conversas
  const { data: conversas, isLoading: loadingConversas } = useQuery({
    queryKey: ["crm_conversas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_conversas")
        .select(`
          *,
          contato:crm_contatos(*),
          agente:crm_agentes(id, nome)
        `)
        .order("ultima_mensagem_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const selectedConversa = useMemo(() => 
    conversas?.find(c => c.id === selectedConversaId), 
    [conversas, selectedConversaId]
  );

  // 2. Carregar mensagens da conversa selecionada
  const { data: mensagens, isLoading: loadingMensagens } = useQuery({
    queryKey: ["crm_mensagens", selectedConversaId],
    queryFn: async () => {
      if (!selectedConversaId) return [];
      const { data, error } = await supabase
        .from("crm_mensagens")
        .select("*")
        .eq("conversa_id", selectedConversaId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedConversaId,
  });

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
    <div className="flex h-full bg-background overflow-hidden">
      {/* Sidebar - Lista de Conversas */}
      <div className="w-80 md:w-96 border-r flex flex-col shrink-0">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Caixa de Entrada</h2>
            <Button variant="ghost" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar conversas..." className="pl-9" />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="divide-y">
            {loadingConversas ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Carregando...</div>
            ) : conversas?.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma conversa.</div>
            ) : (
              conversas?.map((conversa: any) => (
                <ConversationItem 
                  key={conversa.id}
                  conversa={conversa}
                  isSelected={selectedConversaId === conversa.id}
                  onSelect={setSelectedConversaId}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedConversa ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center justify-between bg-background/95 backdrop-blur">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 border">
                  <AvatarFallback className="bg-primary/10 text-primary uppercase">
                    {selectedConversa.contato?.nome?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold leading-none">{selectedConversa.contato?.nome}</h3>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    <Phone className="h-3 w-3" />
                    {selectedConversa.contato?.telefone}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Resolver
                </Button>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20"
            >
              {loadingMensagens ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : mensagens?.map((msg: any) => {
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
                      "group relative px-4 py-2 rounded-2xl text-sm shadow-sm",
                      isOut 
                        ? "bg-primary text-primary-foreground rounded-tr-none" 
                        : "bg-background border rounded-tl-none"
                    )}>
                      <p className="whitespace-pre-wrap">{msg.conteudo}</p>
                      <div className={cn(
                        "mt-1 flex items-center gap-1.5 text-[10px]",
                        isOut ? "text-primary-foreground/70 justify-end" : "text-muted-foreground"
                      )}>
                        {format(new Date(msg.created_at), "HH:mm")}
                        {isOut && (
                          <span className="flex items-center">
                             {msg.wa_status === "read" ? "✓✓" : "✓"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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
                            ? format(new Date(selectedConversa.contato.created_at), "PPP", { locale: ptBR })
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
                            ? format(new Date(selectedConversa.ultima_mensagem_at), "PPp", { locale: ptBR })
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

// Sub-componente memoizado para cada item da lista de conversas
const ConversationItem = React.memo(({ conversa, isSelected, onSelect }: any) => {
  return (
    <button
      onClick={() => onSelect(conversa.id)}
      className={cn(
        "w-full p-4 flex gap-3 text-left transition-colors hover:bg-muted/50",
        isSelected && "bg-muted"
      )}
    >
      <Avatar className="h-10 w-10 border">
        <AvatarFallback className="bg-primary/10 text-primary">
          {conversa.contato?.nome?.[0] || "C"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium truncate">{conversa.contato?.nome || "Sem Nome"}</span>
          <span className="text-[10px] text-muted-foreground">
            {conversa.ultima_mensagem_at && format(new Date(conversa.ultima_mensagem_at), "HH:mm")}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {conversa.ultima_mensagem_preview || "Sem mensagens"}
        </p>
        <div className="mt-2 flex items-center gap-2">
           <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
            {conversa.status}
           </Badge>
           {conversa.agente && (
             <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
               <User className="h-2.5 w-2.5" />
               {conversa.agente.nome}
             </span>
           )}
        </div>
      </div>
    </button>
  );
});

ConversationItem.displayName = "ConversationItem";
