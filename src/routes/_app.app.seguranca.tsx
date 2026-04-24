import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { 
  ShieldCheck, 
  Lock, 
  History, 
  UserCheck, 
  Eye, 
  Key, 
  Fingerprint, 
  Search,
  Calendar,
  Info,
  ChevronDown,
  ChevronRight,
  Activity,
  ShieldAlert
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { AuditoriaDiff } from "@/components/admin/auditoria-diff";
import { RoleGuard } from "@/components/role-guard";

export const Route = createFileRoute("/_app/app/seguranca")({
  head: () => ({ meta: [{ title: "Segurança e Conformidade — FilaMed" }] }),
  component: () => (
    <RoleGuard roles={["admin", "gestor"]} path="/app/seguranca">
      <SecurityPage />
    </RoleGuard>
  ),
});

interface AuditLogRow {
  id: string;
  entidade: string;
  acao: string;
  ator_nome: string | null;
  resumo: string;
  dados_antes: any;
  dados_depois: any;
  created_at: string;
}

function SecurityPage() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!profile?.unidade_id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .eq("unidade_id", profile.unidade_id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        setLogs(data as AuditLogRow[]);
      }
      setLoading(false);
    };

    fetchLogs();
  }, [profile?.unidade_id]);

  const filteredLogs = useMemo(() => {
    if (!search) return logs;
    const s = search.toLowerCase();
    return logs.filter(l => 
      l.resumo.toLowerCase().includes(s) || 
      l.ator_nome?.toLowerCase().includes(s) ||
      l.entidade.toLowerCase().includes(s)
    );
  }, [logs, search]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-slate-50/50 dark:bg-slate-950/50">
      <div className="p-6 space-y-8 max-w-6xl mx-auto w-full">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary mb-1">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-widest">Segurança & Conformidade</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Audit Trail</h1>
            <p className="text-muted-foreground max-w-2xl">
              Transparência total sobre quem acessou o quê e quando. Esta trilha é imutável e serve para auditorias de segurança e conformidade com a LGPD.
            </p>
          </div>
          <div className="flex items-center gap-3">
             <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 border-emerald-500/20 py-1.5 px-3 gap-1.5">
               <Lock className="h-3.5 w-3.5" />
               Dados Criptografados
             </Badge>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur border-slate-200/60 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                  <UserCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-sm">Controle de Acesso</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Apenas usuários autorizados podem visualizar dados sensíveis de pacientes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur border-slate-200/60 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                  <Fingerprint className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-sm">Assinatura Digital</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Cada alteração no sistema é registrada com a identidade digital do autor.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur border-slate-200/60 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <History className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-sm">Histórico Imutável</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Registros retroativos não podem ser apagados ou editados por ninguém.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter and Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Filtrar eventos..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white dark:bg-slate-900"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="h-4 w-4" />
                Últimos 30 dias
              </Button>
            </div>
          </div>

          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="grid grid-cols-[1fr_2fr_1.5fr_1fr_40px] gap-4 p-4 bg-muted/30 border-b text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <div>Data e Hora</div>
              <div>Resumo do Evento</div>
              <div>Ator (Usuário)</div>
              <div>Entidade</div>
              <div></div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-muted-foreground">
                <Activity className="h-6 w-6 animate-spin mx-auto mb-2 opacity-50" />
                Carregando trilha segura...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                Nenhum registro encontrado.
              </div>
            ) : (
              <div className="divide-y">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  return (
                    <div key={log.id} className={cn("transition-colors", isExpanded ? "bg-slate-50 dark:bg-slate-900/40" : "hover:bg-slate-50/50 dark:hover:bg-slate-900/20")}>
                      <div 
                        className="grid grid-cols-[1fr_2fr_1.5fr_1fr_40px] gap-4 p-4 items-center cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      >
                        <div className="text-xs font-medium tabular-nums text-slate-600 dark:text-slate-400">
                          {format(new Date(log.created_at), "dd MMM yyyy, HH:mm", { locale: ptBR })}
                        </div>
                        <div className="text-sm font-semibold flex items-center gap-2">
                          {log.acao === 'delete' && <ShieldAlert className="h-3.5 w-3.5 text-destructive" />}
                          {log.resumo}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                            {log.ator_nome?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || "S"}
                          </div>
                          <span className="text-sm truncate">{log.ator_nome || "Sistema"}</span>
                        </div>
                        <div>
                          <Badge variant="secondary" className="text-[10px] capitalize font-medium">
                            {log.entidade}
                          </Badge>
                        </div>
                        <div className="flex justify-center">
                          {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="pl-4 border-l-2 border-primary/20 space-y-3">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Info className="h-3 w-3" />
                              <span>Detalhes técnicos da alteração (Payload Diff)</span>
                            </div>
                            <AuditoriaDiff before={log.dados_antes} after={log.dados_depois} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-slate-100 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center border shadow-sm shrink-0">
            <Eye className="h-5 w-5 text-slate-500" />
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            <strong>Dica do Gestor:</strong> Use esta trilha para verificar se houve mau uso do sistema ou para comprovar conformidade em casos de litígio. 
            O sistema FilaMed está em conformidade com a <strong>LGPD (Lei Geral de Proteção de Dados)</strong>, garantindo o direito à transparência e rastreabilidade dos dados.
          </div>
        </div>
      </div>
    </div>
  );
}