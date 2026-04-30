import { useState, useMemo } from "react";
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, 
  UserPlus, 
  Shield, 
  Check, 
  X, 
  Search,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

/**
 * AgentConfig: Componente para gerenciar os agentes de atendimento do CRM.
 * Permite listar, adicionar (através de perfis existentes) e ativar/desativar agentes.
 */
export function AgentConfig() {

  const queryClient = useQueryClient();
  const [openAdd, setOpenAdd] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // 1. Carregar agentes com paginação
  const { 
    data: agentesData, 
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ["crm_agentes"],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const pageSize = 15;
      const { data, error } = await supabase
        .from("crm_agentes")
        .select("*")
        .order("nome")
        .range(pageParam, pageParam + pageSize - 1);
      if (error) throw error;
      return data;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || lastPage.length < 15) return undefined;
      return allPages.length * 15;
    },
  });

  const agentes = useMemo(() => 
    agentesData?.pages.flat() || [], 
    [agentesData]
  );

  // 2. Carregar usuários disponíveis para serem agentes
  const { data: users } = useQuery({
    queryKey: ["available_users", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, nome_completo")
        .limit(10);
      
      if (searchTerm) {
        query = query.ilike("nome_completo", `%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: openAdd,
  });

  const addAgentMutation = useMutation({
    mutationFn: async (profile: any) => {
      const { error } = await supabase
        .from("crm_agentes")
        .insert({
          user_id: profile.id,
          nome: profile.nome_completo || "Agente",
          ativo: true
        });
      if (error) throw error;
    },
    onSuccess: () => {
      setOpenAdd(false);
      void queryClient.invalidateQueries({ queryKey: ["crm_agentes"] });
      toast.success("Agente adicionado com sucesso!");
    },
    onError: (err) => {
      toast.error("Erro ao adicionar agente: " + (err as any).message);
    }
  });

  /**
   * Alterna o estado de ativação de um agente.
   */
  const toggleAgentMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string, ativo: boolean }) => {
      const { error } = await supabase
        .from("crm_agentes")
        .update({ ativo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["crm_agentes"] });
    }
  });


  const filteredAgentes = agentes?.filter(a => 
    a.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Configuração de Agentes
          </h2>
          <p className="text-sm text-muted-foreground">Adicione e gerencie quem pode atender no CRM.</p>
        </div>
        
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Novo Agente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Agente</DialogTitle>
              <DialogDescription>
                Selecione um usuário do sistema para atuar como agente de atendimento.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
               <div className="relative">
                 <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                 <Input placeholder="Buscar usuário..." className="pl-9" />
               </div>
               <div className="max-h-[300px] overflow-y-auto border rounded-md">
                 {users?.map(u => (
                    <button
                      key={u.id}
                      onClick={() => addAgentMutation.mutate(u)}
                      disabled={agentes?.some(a => a.user_id === u.id)}
                      className="w-full p-3 flex items-center justify-between hover:bg-muted text-left text-sm disabled:opacity-50"
                    >
                      <div>
                        <p className="font-medium">{u.nome_completo || "Sem nome"}</p>
                      </div>
                      <Plus className="h-4 w-4" />
                    </button>
                 ))}
               </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="p-4 border-b flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Filtrar agentes..." 
              className="pl-9" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="p-4 border-b flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Filtrar agentes..." 
              className="pl-9" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Desde</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Carregando agentes...
                  </TableCell>
                </TableRow>
              ) : filteredAgentes?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhum agente encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {filteredAgentes?.map((agente) => (
                    <TableRow key={agente.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                              {agente.nome?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{agente.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={agente.ativo ? "secondary" : "outline"}
                          className={agente.ativo ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" : ""}
                        >
                          {agente.ativo ? "Ativo" : "Inativa"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {agente.created_at ? new Date(agente.created_at).toLocaleDateString() : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => toggleAgentMutation.mutate({ id: agente.id, ativo: !agente.ativo })}
                        >
                          {agente.ativo ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                          <span className="ml-2">{agente.ativo ? "Desativar" : "Ativar"}</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {hasNextPage && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => fetchNextPage()}
                          disabled={isFetchingNextPage}
                        >
                          {isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Carregar mais agentes
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile List View */}
        <div className="md:hidden divide-y divide-border">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Carregando agentes...
            </div>
          ) : filteredAgentes?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum agente encontrado.
            </div>
          ) : (
            <>
              {filteredAgentes?.map((agente) => (
                <div key={agente.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {agente.nome?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col text-left">
                        <span className="font-bold text-sm">{agente.nome}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-medium">
                          Desde {agente.created_at ? new Date(agente.created_at).toLocaleDateString() : "N/A"}
                        </span>
                      </div>
                    </div>
                    <Badge 
                      variant={agente.ativo ? "secondary" : "outline"}
                      className={agente.ativo ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" : ""}
                    >
                      {agente.ativo ? "Ativo" : "Inativa"}
                    </Badge>
                  </div>
                  <Button 
                    className="w-full justify-center gap-2" 
                    variant={agente.ativo ? "outline" : "default"}
                    size="sm"
                    onClick={() => toggleAgentMutation.mutate({ id: agente.id, ativo: !agente.ativo })}
                  >
                    {agente.ativo ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                    {agente.ativo ? "Desativar Agente" : "Ativar Agente"}
                  </Button>
                </div>
              ))}
              {hasNextPage && (
                <div className="p-4">
                  <Button 
                    variant="ghost" 
                    className="w-full" 
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Carregar mais agentes
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
