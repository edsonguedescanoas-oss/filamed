import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { 
  FileText, 
  Download, 
  BarChart, 
  Users, 
  Target, 
  Activity, 
  Calendar as CalendarIcon,
  Search,
  Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { RoleGuard } from "@/components/role-guard";
import { toast } from "sonner";

export const Route = createFileRoute("/operacao/relatorios")({
  component: () => (
    <RoleGuard permission="manage_users" path="/operacao/relatorios">
      <RelatoriosCRM />
    </RoleGuard>
  ),
});

const MOCK_REPORTS = [
  {
    id: 'pipeline',
    title: 'Análise de Pipeline',
    description: 'Relatório detalhado de leads ativos por estágio, idade no pipeline e valor projetado.',
    icon: <BarChart className="h-5 w-5 text-blue-500" />,
    type: 'Desempenho'
  },
  {
    id: 'conversao',
    title: 'Taxas de Conversão',
    description: 'Conversão por período, origem do lead e performance individual do time de vendas.',
    icon: <Target className="h-5 w-5 text-green-500" />,
    type: 'Vendas'
  },
  {
    id: 'atividades',
    title: 'Atividades Comercial',
    description: 'Volume de ligações, demonstrações e e-mails realizados pelo time no período.',
    icon: <Activity className="h-5 w-5 text-purple-500" />,
    type: 'Produtividade'
  },
  {
    id: 'origem',
    title: 'Canais de Aquisição',
    description: 'Rentabilidade e volume de leads por canal (WhatsApp, Site, Ads, Indicações).',
    icon: <Users className="h-5 w-5 text-orange-500" />,
    type: 'Marketing'
  }
];

function RelatoriosCRM() {
  const [loading, setLoading] = useState(false);

  const handleExport = (reportId: string, format: 'pdf' | 'csv') => {
    setLoading(true);
    toast.info(`Gerando relatório ${reportId.toUpperCase()} em ${format.toUpperCase()}...`);
    
    // Simulating API call
    setTimeout(() => {
      setLoading(false);
      toast.success("Relatório gerado com sucesso!", {
        description: "O download iniciará em instantes."
      });
    }, 2000);
  };

  return (
    <div className="flex flex-col h-screen bg-muted/20 overflow-y-auto">
      <header className="px-6 py-6 border-b bg-background flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Relatórios e Business Intelligence
          </h1>
          <p className="text-sm text-muted-foreground">Extraia dados estratégicos e exporte documentos de performance.</p>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-4 bg-background p-4 rounded-xl border">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar relatório..." className="pl-9" />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Período:</span>
            <Select defaultValue="30d">
              <SelectTrigger className="w-[180px]">
                <CalendarIcon className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Último trimestre</SelectItem>
                <SelectItem value="year">Este ano</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="ghost" size="sm" className="gap-2 ml-auto">
            <Filter className="h-4 w-4" /> Mais Filtros
          </Button>
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {MOCK_REPORTS.map((report) => (
            <Card key={report.id} className="group hover:border-primary/50 transition-colors">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-muted rounded-lg group-hover:bg-primary/10 transition-colors">
                    {report.icon}
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{report.title}</CardTitle>
                    <Badge variant="secondary" className="text-[10px] uppercase font-bold">{report.type}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-6 h-10 overflow-hidden line-clamp-2">
                  {report.description}
                </p>
                <div className="flex gap-2">
                  <Button 
                    className="flex-1 gap-2" 
                    onClick={() => handleExport(report.id, 'pdf')}
                    disabled={loading}
                  >
                    <Download className="h-4 w-4" /> Exportar PDF
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 gap-2" 
                    onClick={() => handleExport(report.id, 'csv')}
                    disabled={loading}
                  >
                    <Download className="h-4 w-4" /> CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <BarChart className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm">Automação de Relatórios</h4>
                <p className="text-xs text-muted-foreground">
                  Você pode agendar o envio automático destes relatórios para o seu e-mail semanalmente. 
                  Configure em <b>Automações &gt; Agendamentos</b>.
                </p>
              </div>
              <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/10">
                Configurar Agendamento
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
