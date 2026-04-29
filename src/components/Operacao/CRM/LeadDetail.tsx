import React, { useState } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from '@/components/ui/dropdown-menu'; // Using generic UI or sheet
import { Lead } from './LeadCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Phone, 
  Mail, 
  Building2, 
  User, 
  Calendar, 
  Clock, 
  History, 
  FileText,
  MessageSquare,
  Plus
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LeadDetailProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onAddNote: (content: string) => void;
}

// Since Sheet is often in components/ui/sheet.tsx
import { 
  Sheet as ShadcnSheet, 
  SheetContent as ShadcnSheetContent, 
  SheetHeader as ShadcnSheetHeader, 
  SheetTitle as ShadcnSheetTitle 
} from '@/components/ui/sheet';

const LeadDetail: React.FC<LeadDetailProps> = ({ lead, isOpen, onClose, onAddNote }) => {
  const [note, setNote] = useState('');

  if (!lead) return null;

  const handleAddNote = () => {
    if (!note.trim()) return;
    onAddNote(note);
    setNote('');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <ShadcnSheet open={isOpen} onOpenChange={onClose}>
      <ShadcnSheetContent className="sm:max-w-xl w-full p-0 flex flex-col">
        <ShadcnSheetHeader className="p-6 pb-2">
          <div className="flex justify-between items-start">
            <div>
              <ShadcnSheetTitle className="text-2xl font-bold">{lead.nome_clinica}</ShadcnSheetTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="capitalize">
                  {lead.estagio_pipeline.replace('_', ' ')}
                </Badge>
                <Badge className={cn(
                  lead.temperatura_lead === 'quente' ? "bg-orange-500" : 
                  lead.temperatura_lead === 'morno' ? "bg-yellow-500" : "bg-blue-500"
                )}>
                  {lead.temperatura_lead.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>
        </ShadcnSheetHeader>

        <Separator />

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-8">
            {/* Quick Actions */}
            <div className="grid grid-cols-4 gap-2">
              <Button variant="outline" size="sm" className="flex flex-col h-auto py-2 gap-1">
                <Phone className="h-4 w-4" />
                <span className="text-[10px]">Ligar</span>
              </Button>
              <Button variant="outline" size="sm" className="flex flex-col h-auto py-2 gap-1 text-green-600 border-green-200 bg-green-50">
                <MessageSquare className="h-4 w-4" />
                <span className="text-[10px]">WhatsApp</span>
              </Button>
              <Button variant="outline" size="sm" className="flex flex-col h-auto py-2 gap-1">
                <Mail className="h-4 w-4" />
                <span className="text-[10px]">E-mail</span>
              </Button>
              <Button variant="outline" size="sm" className="flex flex-col h-auto py-2 gap-1">
                <Calendar className="h-4 w-4" />
                <span className="text-[10px]">Reunião</span>
              </Button>
            </div>

            {/* Info Section */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" /> Informações do Lead
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-xs text-muted-foreground block">Contato</label>
                  <span className="flex items-center gap-1 font-medium">
                    <User className="h-3 w-3" /> {lead.nome_contato}
                  </span>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block">Valor Potencial</label>
                  <span className="font-medium text-primary">{formatCurrency(lead.valor_potencial)}</span>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block">Telefone</label>
                  <span className="font-medium">{lead.telefone || 'N/A'}</span>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block">Email</label>
                  <span className="font-medium truncate">{lead.email || 'N/A'}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Tabs for Timeline and Notes */}
            <Tabs defaultValue="historico" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="historico" className="flex items-center gap-2">
                  <History className="h-4 w-4" /> Histórico
                </TabsTrigger>
                <TabsTrigger value="notas" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Notas
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="historico" className="pt-4 space-y-4">
                <div className="relative pl-6 border-l-2 border-muted ml-3 space-y-6">
                  <div className="relative">
                    <div className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-primary border-4 border-background" />
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-semibold">Lead Criado</span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(lead.data_atualizacao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Lead importado via sistema automático de triagem.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="notas" className="pt-4 space-y-4">
                <div className="space-y-2">
                  <Textarea 
                    placeholder="Adicionar nota interna..." 
                    className="min-h-[100px] text-sm"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <Button size="sm" className="w-full gap-2" onClick={handleAddNote}>
                    <Plus className="h-4 w-4" /> Salvar Nota
                  </Button>
                </div>
                
                <div className="space-y-3 mt-6">
                  {/* Placeholder for notes */}
                  <p className="text-center text-xs text-muted-foreground py-8 italic">
                    Nenhuma nota interna registrada ainda.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </ShadcnSheetContent>
    </ShadcnSheet>
  );
};

export default LeadDetail;
