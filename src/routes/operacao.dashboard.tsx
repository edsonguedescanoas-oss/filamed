import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { 
  Users, 
  TrendingUp, 
  Clock, 
  Target, 
  DollarSign, 
  BarChart3, 
  PieChart as PieChartIcon, 
  Calendar,
  MoreVertical,
  ArrowRight,
  Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import MetricCard from "@/components/Operacao/Dashboard/MetricCard";
import FunilChart from "@/components/Operacao/Dashboard/FunilChart";
import { RoleGuard } from "@/components/role-guard";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/operacao/dashboard")({
  component: () => (
    <RoleGuard permission="manage_users" path="/operacao/dashboard">
      <DashboardComercial />
    </RoleGuard>
  ),
});

const PIE_COLORS = ['#0ea5e9', '#6366f1', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6'];

const mockEvolutionData = [
  { name: 'Jan', capturados: 45, convertidos: 12 },
  { name: 'Fev', capturados: 52, convertidos: 15 },
  { name: 'Mar', capturados: 61, convertidos: 18 },
  { name: 'Abr', capturados: 58, convertidos: 22 },
  { name: 'Mai', capturados: 75, convertidos: 28 },
];

const mockSourceData = [
  { name: 'WhatsApp', value: 45 },
  { name: 'Site', value: 25 },
  { name: 'Indicação', value: 15 },
  { name: 'LinkedIn', value: 10 },
  { name: 'Outros', value: 5 },
];

function DashboardComercial() {
  const [loading, setLoading] = useState(true);
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      // 1. Fetch Funnel Data
      const { data: leadsData } = await supabase.from('leads').select('estagio_pipeline');
      
      const stages = [
        { id: 'novo_lead', label: 'Novo Lead' },
        { id: 'qualificacao', label: 'Qualificação' },
        { id: 'demonstracao', label: 'Demonstração' },
        { id: 'proposta', label: 'Proposta' },
        { id: 'negociacao', label: 'Negociação' },
        { id: 'fechado_ganho', label: 'Ganhos' },
      ];

      const counts = stages.map(stage => ({
        stage: stage.label,
        count: leadsData?.filter(l => l.estagio_pipeline === stage.id).length || 0,
        conversion: '100%' // Idealmente calculado
      }));

      setFunnelData(counts);

      // 2. Fetch Recent Leads
      const { data: recent } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      setRecentLeads(recent || []);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-muted/20 overflow-y-auto">
      <header className="px-6 py-6 border-b bg-background flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Dashboard Comercial
          </h1>
          <p className="text-sm text-muted-foreground">Visão estratégica do pipeline e performance de vendas.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar className="h-4 w-4" /> Últimos 30 Dias
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" /> Filtros
          </Button>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <MetricCard 
            title="Leads Ativos" 
            value={842} 
            trend={12} 
            icon={<Users className="h-4 w-4" />}
            description="Leads no pipeline atual"
          />
          <MetricCard 
            title="Taxa Conversão" 
            value="18.5" 
            prefix=""
            trend={5} 
            icon={<Target className="h-4 w-4" />}
            description="Média global de fechamento"
          />
          <MetricCard 
            title="Tempo Médio" 
            value={14} 
            description="Dias até o fechamento"
            trend={-8} 
            icon={<Clock className="h-4 w-4" />}
          />
          <MetricCard 
            title="Ganhos (Mês)" 
            value={28} 
            trend={15} 
            icon={<TrendingUp className="h-4 w-4" />}
            description="Contratos assinados este mês"
          />
          <MetricCard 
            title="Ticket Médio" 
            value="1.450" 
            prefix="R$"
            trend={2} 
            icon={<DollarSign className="h-4 w-4" />}
            description="Valor médio por contrato"
          />
          <MetricCard 
            title="Previsão Receita" 
            value="145K" 
            prefix="R$"
            trend={24} 
            icon={<TrendingUp className="h-4 w-4 text-primary" />}
            description="Potencial em negociação"
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Funil de Vendas</CardTitle>
              <CardDescription>Distribuição de leads por estágio do pipeline.</CardDescription>
            </CardHeader>
            <CardContent>
              <FunilChart data={funnelData} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Evolução de Leads</CardTitle>
              <CardDescription>Comparativo entre leads capturados e convertidos.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockEvolutionData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                    <Line type="monotone" dataKey="capturados" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="convertidos" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Origem dos Leads</CardTitle>
              <CardDescription>Principais canais de aquisição.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={mockSourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {mockSourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-lg font-bold">Leads Recentes</CardTitle>
                <CardDescription>Últimas entradas no sistema comercial.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="gap-1 text-primary">
                Ver Todos <ArrowRight className="h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs uppercase font-bold tracking-wider">Clínica</TableHead>
                    <TableHead className="text-xs uppercase font-bold tracking-wider">Estágio</TableHead>
                    <TableHead className="text-xs uppercase font-bold tracking-wider">Valor</TableHead>
                    <TableHead className="text-xs uppercase font-bold tracking-wider text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentLeads.map((lead) => (
                    <TableRow key={lead.id} className="hover:bg-muted/50 cursor-pointer">
                      <TableCell className="py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">{lead.nome_clinica}</span>
                          <span className="text-[10px] text-muted-foreground">{lead.nome_contato}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] capitalize bg-background">
                          {lead.estagio_pipeline.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        R$ {lead.valor_potencial?.toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Ver Detalhes</DropdownMenuItem>
                            <DropdownMenuItem>Agendar Demo</DropdownMenuItem>
                            <DropdownMenuItem className="text-green-600">Falar WhatsApp</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
