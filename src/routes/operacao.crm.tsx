import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import PipelineKanban from "@/components/Operacao/CRM/PipelineKanban";
import LeadDetail from "@/components/Operacao/CRM/LeadDetail";
import { Lead, PipelineStage } from "@/components/Operacao/CRM/LeadCard";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Search, Filter, Plus, LayoutDashboard, ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RoleGuard } from "@/components/role-guard";

export const Route = createFileRoute("/operacao/crm")({
  component: () => (
    <RoleGuard permission="manage_users" path="/operacao/crm">
      <CRMOperacaoPage />
    </RoleGuard>
  ),
});

function CRMOperacaoPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStage, setFilterStage] = useState<string>("all");

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('data_atualizacao', { ascending: false });

      if (error) throw error;
      setLeads(data as unknown as Lead[]);
    } catch (error: any) {
      toast.error("Erro ao buscar leads", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }

  const handleLeadMove = async (leadId: string, newStage: PipelineStage) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ estagio_pipeline: newStage, data_atualizacao: new Date().toISOString() })
        .eq('id', leadId);

      if (error) throw error;

      setLeads(prev => prev.map(lead => 
        lead.id === leadId ? { ...lead, estagio_pipeline: newStage, data_atualizacao: new Date().toISOString() } : lead
      ));

      toast.success("Estágio atualizado", {
        description: "O lead foi movido com sucesso.",
      });
    } catch (error: any) {
      toast.error("Erro ao mover lead", {
        description: error.message,
      });
    }
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDetailOpen(true);
  };

  const handleAddNote = async (content: string) => {
    if (!selectedLead) return;
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { error } = await supabase
        .from('interacoes')
        .insert({
          lead_id: selectedLead.id,
          tipo: 'nota',
          conteudo: content,
          usuario_id: userData.user.id
        });

      if (error) throw error;

      toast.success("Nota adicionada", {
        description: "A interação foi registrada no histórico.",
      });
    } catch (error: any) {
      toast.error("Erro ao adicionar nota", {
        description: error.message,
      });
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.nome_clinica.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.nome_contato.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = filterStage === "all" || lead.estagio_pipeline === filterStage;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="px-6 py-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-primary" />
            CRM de Operação
          </h1>
          <p className="text-sm text-muted-foreground">Gestão comercial e pipeline de clínicas.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <ListFilter className="h-4 w-4" /> Exportar
          </Button>
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Novo Lead
          </Button>
        </div>
      </header>

      {/* Toolbar / Filters */}
      <div className="px-6 py-3 border-b bg-muted/20 flex flex-wrap items-center gap-3 shrink-0">
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar clínicas ou contatos..." 
            className="pl-9 h-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Select value={filterStage} onValueChange={setFilterStage}>
          <SelectTrigger className="w-full md:w-48 h-9">
            <Filter className="h-3.5 w-3.5 mr-2" />
            <SelectValue placeholder="Todos os estágios" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estágios</SelectItem>
            <SelectItem value="novo_lead">Novo Lead</SelectItem>
            <SelectItem value="qualificacao">Qualificação</SelectItem>
            <SelectItem value="proposta">Proposta</SelectItem>
            <SelectItem value="fechado_ganho">Ganhos</SelectItem>
            <SelectItem value="fechado_perdido">Perdidos</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span>{filteredLeads.length} leads encontrados</span>
        </div>
      </div>

      {/* Kanban Board */}
      <main className="flex-1 overflow-hidden p-6 bg-muted/10">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <PipelineKanban 
            leads={filteredLeads} 
            onLeadMove={handleLeadMove}
            onLeadClick={handleLeadClick}
          />
        )}
      </main>

      {/* Lead Detail Drawer */}
      <LeadDetail 
        lead={selectedLead} 
        isOpen={isDetailOpen} 
        onClose={() => setIsDetailOpen(false)}
        onAddNote={handleAddNote}
      />
    </div>
  );
}
