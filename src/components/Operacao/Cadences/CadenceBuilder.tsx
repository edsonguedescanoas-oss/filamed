import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Mail, MessageSquare, Phone, CheckCircle2, GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Step {
  id: string;
  day: number;
  channel: 'whatsapp' | 'email' | 'ligacao' | 'tarefa';
  content: string;
}

const CadenceBuilder = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<Step[]>([
    { id: '1', day: 0, channel: 'whatsapp', content: 'Olá {{nome_contato}}...' }
  ]);

  const addStep = () => {
    const lastDay = steps.length > 0 ? steps[steps.length - 1].day : 0;
    setSteps([...steps, { 
      id: Math.random().toString(36).substring(7), 
      day: lastDay + 2, 
      channel: 'email', 
      content: '' 
    }]);
  };

  const removeStep = (id: string) => {
    setSteps(steps.filter(s => s.id !== id));
  };

  const updateStep = (id: string, updates: Partial<Step>) => {
    setSteps(steps.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const saveCadence = () => {
    if (!name) {
      toast.error("Dê um nome à cadência");
      return;
    }
    toast.success("Cadência salva com sucesso!", { description: "Agora ela pode ser atribuída aos leads." });
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp': return <MessageSquare className="h-4 w-4 text-green-500" />;
      case 'email': return <Mail className="h-4 w-4 text-blue-500" />;
      case 'ligacao': return <Phone className="h-4 w-4 text-orange-500" />;
      default: return <CheckCircle2 className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Criar Nova Cadência</h2>
          <p className="text-muted-foreground">Configure sequências automatizadas de follow-up.</p>
        </div>
        <Button onClick={saveCadence}>Salvar Cadência</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Informações Gerais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Cadência</Label>
              <Input 
                placeholder="Ex: Padrão 14 Dias" 
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea 
                placeholder="Para que serve esta cadência?" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="pt-4 border-t">
              <h4 className="text-sm font-semibold mb-2">Variáveis Disponíveis</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="cursor-help">{"{{nome_contato}}"}</Badge>
                <Badge variant="outline" className="cursor-help">{"{{nome_clinica}}"}</Badge>
                <Badge variant="outline" className="cursor-help">{"{{data_demo}}"}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Etapas da Sequência</CardTitle>
              <CardDescription>Defina os dias e canais de contato.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addStep} className="gap-2">
              <Plus className="h-4 w-4" /> Adicionar Etapa
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {steps.sort((a,b) => a.day - b.day).map((step, index) => (
              <div key={step.id} className="flex gap-4 p-4 border rounded-lg bg-slate-50 relative group">
                <div className="flex flex-col items-center gap-2 pt-2">
                   <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                    {index + 1}
                   </div>
                   <div className="w-px h-full bg-slate-200 group-last:hidden" />
                </div>
                
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-4">
                  <div className="sm:col-span-2 space-y-2">
                    <Label className="text-xs">Dia</Label>
                    <Input 
                      type="number" 
                      value={step.day} 
                      onChange={(e) => updateStep(step.id, { day: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="sm:col-span-3 space-y-2">
                    <Label className="text-xs">Canal</Label>
                    <Select 
                      value={step.channel}
                      onValueChange={(val: any) => updateStep(step.id, { channel: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="email">E-mail</SelectItem>
                        <SelectItem value="ligacao">Ligação</SelectItem>
                        <SelectItem value="tarefa">Tarefa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-7 space-y-2">
                    <Label className="text-xs">Conteúdo/Template</Label>
                    <div className="relative">
                      <Textarea 
                        placeholder="Escreva a mensagem ou assunto..." 
                        className="min-h-[80px]"
                        value={step.content}
                        onChange={(e) => updateStep(step.id, { content: e.target.value })}
                      />
                      <div className="absolute top-2 right-2">
                        {getChannelIcon(step.channel)}
                      </div>
                    </div>
                  </div>
                </div>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => removeStep(step.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CadenceBuilder;
