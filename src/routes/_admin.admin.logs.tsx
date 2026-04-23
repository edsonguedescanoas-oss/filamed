import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Loader2, Search, Filter, AlertCircle, CheckCircle2, XCircle, Info, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_admin/admin/logs")({
  head: () => ({
    meta: [{ title: "Admin · Logs de Notificações — FilaMed" }],
  }),
  component: AdminLogsPage,
});

interface LogRow {
  id: string;
  created_at: string;
  destinatario: string;
  mensagem: string;
  status: "pendente" | "enviada" | "falhou" | "ignorado";
  erro: string | null;
  canal: string;
  unidade: { nome: string } | null;
  senha: { codigo: string } | null;
}

const STATUS_CONFIG = {
  pendente: { label: "Pendente", icon: Info, className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" },
  enviada: { label: "Enviada", icon: CheckCircle2, className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  falhou: { label: "Falhou", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
  ignorado: { label: "Ignorado", icon: AlertCircle, className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { 
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
}

function AdminLogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [unidades, setUnidades] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [unidadeFilter, setUnidadeFilter] = useState<string>("all");

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("unidades").select("id, nome").order("nome");
      if (data) setUnidades(data);
    })();
  }, []);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      setLoading(true);
      let query = supabase
        .from("notificacoes_log")
        .select(`
          id, created_at, destinatario, mensagem, status, erro, canal,
          unidade:unidades(nome),
          senha:senhas(codigo)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as any);
      }
      
      if (unidadeFilter !== "all") {
        query = query.eq("unidade_id", unidadeFilter);
      }

      const { data, error } = await query;
      
      if (cancel) return;
      if (error) {
        console.error(error);
      } else {
        setLogs((data ?? []) as unknown as LogRow[]);
      }
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [statusFilter, unidadeFilter]);

  const filtered = logs.filter((log) => {
    const matchesQuery = 
      log.destinatario.includes(q) || 
      log.mensagem.toLowerCase().includes(q.toLowerCase()) ||
      log.unidade?.nome.toLowerCase().includes(q.toLowerCase()) ||
      log.senha?.codigo.toLowerCase().includes(q.toLowerCase());
    
    return matchesQuery;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Logs de Notificações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Histórico detalhado de todas as tentativas de envio de notificações.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Últimos registros
            </CardTitle>
            <CardDescription>Mostrando os últimos 100 eventos processados.</CardDescription>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar destinatário, mensagem ou unidade…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={unidadeFilter} onValueChange={setUnidadeFilter}>
              <SelectTrigger className="w-[180px]">
                <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Todas Unidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Unidades</SelectItem>
                {unidades.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="enviada">Enviadas</SelectItem>
                <SelectItem value="falhou">Falhas</SelectItem>
                <SelectItem value="ignorado">Ignoradas</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhum log encontrado para os filtros selecionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Data/Hora</TableHead>
                    <TableHead>Unidade / Senha</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Mensagem / Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((log) => {
                    const status = STATUS_CONFIG[log.status] || STATUS_CONFIG.pendente;
                    const Icon = status.icon;
                    
                    return (
                      <TableRow key={log.id} className="group">
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {fmtDate(log.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{log.unidade?.nome || "Sistema"}</span>
                            {log.senha && (
                              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                Senha: {log.senha.codigo}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-mono">{log.destinatario}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("gap-1.5", status.className)}>
                            <Icon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 max-w-md">
                            <p className="text-sm line-clamp-2 italic text-muted-foreground group-hover:line-clamp-none transition-all">
                              "{log.mensagem}"
                            </p>
                            {(log.status === "falhou" || log.status === "ignorado") && log.erro && (
                              <div className="flex items-start gap-1.5 rounded bg-muted/50 p-1.5 text-[11px] text-muted-foreground border border-border/50">
                                <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                                <span>{log.erro}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}