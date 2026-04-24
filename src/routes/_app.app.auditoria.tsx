import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { 
  ShieldCheck, 
  Search, 
  Filter, 
  ArrowLeft, 
  Calendar as CalendarIcon,
  User as UserIcon,
  Tag,
  Clock,
  Layout,
  History
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RoleGuard } from "@/components/role-guard";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/app/auditoria")({
  head: () => ({ meta: [{ title: "Auditoria — FilaMed" }] }),
  component: () => (
    <RoleGuard permission="view_reports" path="/app/auditoria">
      <AuditoriaPage />
    </RoleGuard>
  ),
});

function AuditoriaPage() {
  const { profile } = useAuth();
  const unidadeId = profile?.unidade_id;
  
  const [loading, setLoading] = useState(true);
  const [senhas, setSenhas] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [origemFilter, setOrigemFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("today");

  const fetchAuditLog = async () => {
    if (!unidadeId) return;
    setLoading(true);
    
    try {
      let query = supabase
        .from("senhas")
        .select(`
          id,
          codigo,
          origem,
          created_at,
          prioridade,
          status,
          paciente:pacientes(nome_completo),
          fila:filas(nome),
          criador:profiles(nome_completo)
        `)
        .eq("unidade_id", unidadeId)
        .order("created_at", { ascending: false })
        .limit(100);

      // Filtro de data
      const now = new Date();
      if (dateFilter === "today") {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        query = query.gte("created_at", startOfDay);
      } else if (dateFilter === "yesterday") {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).toISOString();
        const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        query = query.gte("created_at", startOfYesterday).lt("created_at", endOfYesterday);
      } else if (dateFilter === "week") {
        const lastWeek = new Date(now);
        lastWeek.setDate(lastWeek.getDate() - 7);
        query = query.gte("created_at", lastWeek.toISOString());
      }

      if (origemFilter !== "all") {
        query = query.eq("origem", origemFilter);
      }

      if (search.trim()) {
        query = query.or(`codigo.ilike.%${search}%,paciente.nome_completo.ilike.%${search}%`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setSenhas(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar auditoria:", error);
      toast.error("Erro ao carregar histórico: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLog();
  }, [unidadeId, dateFilter, origemFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAuditLog();
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-slate-50/50 dark:bg-slate-950/50">
      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Auditoria de Senhas
          </h1>
          <p className="text-muted-foreground">
            Histórico completo de emissão de senhas para diagnóstico e suporte.
          </p>
        </div>

        <div className="grid gap-4 md:flex md:items-end flex-wrap bg-background p-4 rounded-xl border shadow-sm">
          <form onSubmit={handleSearch} className="flex-1 min-w-[240px]">
            <label className="text-xs font-medium mb-1.5 block text-muted-foreground uppercase tracking-wider">Buscar por código ou paciente</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ex: CLIN001 ou João..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </form>

          <div className="w-full md:w-[180px]">
            <label className="text-xs font-medium mb-1.5 block text-muted-foreground uppercase tracking-wider">Origem</label>
            <Select value={origemFilter} onValueChange={setOrigemFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todas origens" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="recepcao">Recepção</SelectItem>
                <SelectItem value="totem">Totem</SelectItem>
                <SelectItem value="online">Online</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-[180px]">
            <label className="text-xs font-medium mb-1.5 block text-muted-foreground uppercase tracking-wider">Período</label>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Hoje" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="yesterday">Ontem</SelectItem>
                <SelectItem value="week">Últimos 7 dias</SelectItem>
                <SelectItem value="all">Tudo (últimos 100)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={fetchAuditLog} variant="secondary">
            Filtrar
          </Button>
        </div>

        <div className="rounded-xl border bg-background shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[180px]">Data/Hora</TableHead>
                <TableHead>Senha</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Fila</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Usuário (Emissor)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  </TableRow>
                ))
              ) : senhas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Nenhuma senha encontrada para os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                senhas.map((senha) => (
                  <TableRow key={senha.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(senha.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={senha.prioridade === 'normal' ? 'outline' : 'secondary'} className="font-mono text-sm">
                        {senha.codigo}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate max-w-[200px]">{senha.paciente?.nome_completo || "Anônimo"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Layout className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{senha.fila?.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {senha.origem}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "capitalize font-normal",
                          senha.status === 'aguardando' && "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
                          senha.status === 'chamando' && "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
                          senha.status === 'atendimento' && "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
                          senha.status === 'finalizada' && "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
                          senha.status === 'ausente' && "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                        )}
                      >
                        {senha.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {senha.criador ? (
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                            {senha.criador.nome_completo.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm">{senha.criador.nome_completo}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">
                          {senha.origem === 'totem' ? 'Autoatendimento' : 'N/A'}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
