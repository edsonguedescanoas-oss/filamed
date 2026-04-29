import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import PipelineKanban from "@/components/Operacao/CRM/PipelineKanban";
import LeadDetail, { Interacao } from "@/components/Operacao/CRM/LeadDetail";
import { Lead, PipelineStage } from "@/components/Operacao/CRM/LeadCard";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Search, Filter, Plus, LayoutDashboard, ListFilter, TrendingUp, Clock } from "lucide-react";
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
  const [interacoes, setInteracoes] = useState<Interacao[]>([]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterValueRange, setFilterValueRange] = useState<string>("all");

  const [highlightThreshold, setHighlightThreshold] = useState<number>(3);

  useEffect(() => {
    fetchLeads();

    const leadsSubscription = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newLead = payload.new as Lead;
            setLeads(prev => [newLead, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedLead = payload.new as Lead;
            setLeads(prev => prev.map(lead => 
              lead.id === updatedLead.id ? updatedLead : lead
            ));
            if (selectedLead?.id === updatedLead.id) {
              setSelectedLead(updatedLead);
            }
          } else if (payload.eventType === 'DELETE') {
            setLeads(prev => prev.filter(lead => lead.id !== payload.old.id));
            if (selectedLead?.id === payload.old.id) {
              setIsDetailOpen(false);
              setSelectedLead(null);
            }
          }
        }
      )
      .subscribe();

    const interacoesSubscription = supabase
      .channel('interacoes-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'interacoes' },
        (payload) => {
          const newInteracao = payload.new as Interacao;
          if (selectedLead?.id === newInteracao.lead_id) {
            setInteracoes(prev => [newInteracao, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leadsSubscription);
      supabase.removeChannel(interacoesSubscription);
    };
  }, [selectedLead?.id]);

  useEffect(() => {
    if (selectedLead) {
      fetchInteracoes(selectedLead.id);
    } else {
      setInteracoes([]);
    }
  }, [selectedLead]);

  async function fetchInteracoes(leadId: string) {
    try {
      const { data, error } = await supabase
        .from('interacoes')
        .select('*')
        .eq('lead_id', leadId)
        .order('data_criacao', { ascending: false });

      if (error) throw error;
      setInteracoes(data as unknown as Interacao[]);
    } catch (error: any) {
      console.error("Erro ao buscar interações:", error.message);
    }
  }

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

      await fetchInteracoes(selectedLead.id);

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
    const matchesSearch = 
      lead.nome_clinica.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.nome_contato.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.telefone && lead.telefone.includes(searchTerm));
      
    const matchesStage = filterStage === "all" || lead.estagio_pipeline === filterStage;
    
    let matchesValue = true;
    if (filterValueRange !== "all") {
      const value = lead.valor_potencial;
      switch (filterValueRange) {
        case "under_1k": matchesValue = value < 1000; break;
        case "1k_5k": matchesValue = value >= 1000 && value <= 5000; break;
        case "5k_10k": matchesValue = value > 5000 && value <= 10000; break;
        case "over_10k": matchesValue = value > 10000; break;
      }
    }
    
    return matchesSearch && matchesStage && matchesValue;
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
            placeholder="Buscar clínicas, contatos, email..." 
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
            <SelectItem value="contato_inicial">Contato Inicial</SelectItem>
            <SelectItem value="qualificacao">Qualificação</SelectItem>
            <SelectItem value="demonstracao">Demonstração</SelectItem>
            <SelectItem value="proposta">Proposta</SelectItem>
            <SelectItem value="negociacao">Negociação</SelectItem>
            <SelectItem value="fechado_ganho">Ganhos</SelectItem>
            <SelectItem value="fechado_perdido">Perdidos</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterValueRange} onValueChange={setFilterValueRange}>
          <SelectTrigger className="w-full md:w-48 h-9">
            <TrendingUp className="h-3.5 w-3.5 mr-2 text-primary" />
            <SelectValue placeholder="Faixa de valor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Qualquer valor</SelectItem>
            <SelectItem value="under_1k">Até R$ 1.000</SelectItem>
            <SelectItem value="1k_5k">R$ 1.000 - R$ 5.000</SelectItem>
            <SelectItem value="5k_10k">R$ 5.000 - R$ 10.000</SelectItem>
            <SelectItem value="over_10k">Acima de R$ 10.000</SelectItem>
          </SelectContent>
        </Select>

        <Select value={highlightThreshold.toString()} onValueChange={(v) => setHighlightThreshold(parseInt(v))}>
          <SelectTrigger className="w-full md:w-48 h-9">
            <Clock className="h-3.5 w-3.5 mr-2" />
            <SelectValue placeholder="Alerta de inatividade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Sem interação há 1 dia</SelectItem>
            <SelectItem value="3">Sem interação há 3 dias</SelectItem>
            <SelectItem value="7">Sem interação há 7 dias</SelectItem>
            <SelectItem value="15">Sem interação há 15 dias</SelectItem>
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
        interacoes={interacoes}
        isOpen={isDetailOpen} 
        onClose={() => setIsDetailOpen(false)}
        onAddNote={handleAddNote}
      />
    </div>
  );
}
