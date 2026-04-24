import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, AlertCircle, ChevronDown, ChevronRight, LayoutPanelLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';

export type Operator = '>=' | '<=' | '==' | '!=' | '>' | '<';
export type LogicOperator = 'AND' | 'OR';
export type ClassificationType = 'Normal' | 'Prioritário' | 'Urgente';

export interface Rule {
  id: string;
  field: string;
  operator: Operator;
  value: string;
}

export interface RuleGroup {
  id: string;
  logic: LogicOperator;
  rules: (Rule | RuleGroup)[];
}

export interface Criteria {
  id: string;
  name: string;
  classification: ClassificationType;
  rootGroup: RuleGroup;
}

const AVAILABLE_FIELDS = [
  { label: 'Idade', value: 'idade', type: 'number' },
  { label: 'Temperatura (°C)', value: 'temperatura', type: 'number' },
  { label: 'Saturação (%)', value: 'saturacao', type: 'number' },
  { label: 'Pressão Sistólica (mmHg)', value: 'pressao_sistolica', type: 'number' },
  { label: 'Pressão Diastólica (mmHg)', value: 'pressao_diastolica', type: 'number' },
  { label: 'Frequência Cardíaca (bpm)', value: 'freq_cardiaca', type: 'number' },
  { label: 'Frequência Respiratória (irpm)', value: 'freq_respiratoria', type: 'number' },
  { label: 'Glicemia (mg/dL)', value: 'glicemia', type: 'number' },
  { label: 'Dor (0-10)', value: 'dor', type: 'number' },
  { label: 'Sintomas Respiratórios', value: 'sintomas_respiratorios', type: 'boolean' },
  { label: 'Gestante', value: 'gestante', type: 'boolean' },
  { label: 'Diabético', value: 'diabetico', type: 'boolean' },
  { label: 'Hipertenso', value: 'hipertenso', type: 'boolean' },
];

const OPERATORS: { label: string; value: Operator }[] = [
  { label: 'Igual a', value: '==' },
  { label: 'Diferente de', value: '!=' },
  { label: 'Maior que', value: '>' },
  { label: 'Menor que', value: '<' },
  { label: 'Maior ou igual a', value: '>=' },
  { label: 'Menor ou igual a', value: '<=' },
];

const RuleRow = ({ 
  rule, 
  onDelete, 
  onChange 
}: { 
  rule: Rule; 
  onDelete: () => void; 
  onChange: (updates: Partial<Rule>) => void;
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border/50 animate-fade-in">
      <Select 
        value={rule.field} 
        onValueChange={(v) => onChange({ field: v })}
      >
        <SelectTrigger className="w-[180px] h-8 text-xs">
          <SelectValue placeholder="Campo" />
        </SelectTrigger>
        <SelectContent>
          {AVAILABLE_FIELDS.map((f) => (
            <SelectItem key={f.value} value={f.value} className="text-xs">{f.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select 
        value={rule.operator} 
        onValueChange={(v) => onChange({ operator: v as Operator })}
      >
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue placeholder="Operador" />
        </SelectTrigger>
        <SelectContent>
          {OPERATORS.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input 
        type="text"
        placeholder="Valor" 
        value={rule.value}
        onChange={(e) => onChange({ value: e.target.value })}
        className="w-[100px] h-8 text-xs"
      />

      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onDelete}
        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

const RuleGroupEditor = ({ 
  group, 
  onDelete, 
  onChange,
  depth = 0
}: { 
  group: RuleGroup; 
  onDelete?: () => void; 
  onChange: (updates: Partial<RuleGroup>) => void;
  depth?: number;
}) => {
  const addRule = () => {
    const newRule: Rule = {
      id: crypto.randomUUID(),
      field: AVAILABLE_FIELDS[0].value,
      operator: '==',
      value: '',
    };
    onChange({ rules: [...group.rules, newRule] });
  };

  const addGroup = () => {
    const newGroup: RuleGroup = {
      id: crypto.randomUUID(),
      logic: 'AND',
      rules: [],
    };
    onChange({ rules: [...group.rules, newGroup] });
  };

  const removeChild = (id: string) => {
    onChange({ rules: group.rules.filter((r) => r.id !== id) });
  };

  const updateChild = (id: string, updates: any) => {
    onChange({
      rules: group.rules.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    });
  };

  const toggleLogic = () => {
    onChange({ logic: group.logic === 'AND' ? 'OR' : 'AND' });
  };

  return (
    <div className={`space-y-3 p-4 rounded-xl border ${depth > 0 ? 'bg-background/50 ml-6' : 'bg-muted/30'} border-border relative`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleLogic}
            className={`h-7 px-3 text-[10px] font-bold uppercase tracking-wider ${
              group.logic === 'AND' 
                ? 'border-primary/30 text-primary bg-primary/5' 
                : 'border-orange-500/30 text-orange-600 bg-orange-500/5'
            }`}
          >
            {group.logic === 'AND' ? 'E (AND)' : 'OU (OR)'}
          </Button>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
            {group.rules.length} {group.rules.length === 1 ? 'regra' : 'regras'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={addRule} className="h-7 text-[10px] gap-1">
            <Plus className="h-3 w-3" /> Regra
          </Button>
          <Button variant="ghost" size="sm" onClick={addGroup} className="h-7 text-[10px] gap-1">
            <Plus className="h-3 w-3" /> Grupo
          </Button>
          {onDelete && (
            <Button variant="ghost" size="sm" onClick={onDelete} className="h-7 w-7 text-destructive">
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {group.rules.map((child) => (
          'rules' in child ? (
            <RuleGroupEditor 
              key={child.id} 
              group={child} 
              onDelete={() => removeChild(child.id)}
              onChange={(updates) => updateChild(child.id, updates)}
              depth={depth + 1}
            />
          ) : (
            <RuleRow 
              key={child.id} 
              rule={child} 
              onDelete={() => removeChild(child.id)}
              onChange={(updates) => updateChild(child.id, updates)}
            />
          )
        ))}
        {group.rules.length === 0 && (
          <div className="py-6 text-center border border-dashed border-border/60 rounded-lg">
            <p className="text-xs text-muted-foreground italic">Nenhuma regra definida neste grupo.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const CriteriaEditor = () => {
  const { profile } = useAuth();
  const [criterias, setCriterias] = useState<Criteria[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.unidade_id) {
      fetchCriteria();
    }
  }, [profile?.unidade_id]);

  const fetchCriteria = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('triagem_criterios')
        .select('*')
        .eq('unidade_id', profile?.unidade_id as string)
        .order('ordem', { ascending: true });

      if (error) throw error;

      const mappedCriteria: Criteria[] = (data || []).map((item: any) => ({
        id: item.id,
        name: item.nome,
        classification: mapDbToUiClassification(item.prioridade),
        rootGroup: item.regras as RuleGroup,
      }));

      setCriterias(mappedCriteria);
      if (mappedCriteria.length > 0 && !editingId) {
        setEditingId(mappedCriteria[0].id);
      }
    } catch (error: any) {
      console.error('Erro ao buscar critérios:', error);
      toast.error('Não foi possível carregar os critérios');
    } finally {
      setLoading(false);
    }
  };

  const mapUiToDbClassification = (ui: ClassificationType): 'normal' | 'preferencial' | 'urgente' => {
    switch (ui) {
      case 'Prioritário': return 'preferencial';
      case 'Urgente': return 'urgente';
      default: return 'normal';
    }
  };

  const mapDbToUiClassification = (db: string): ClassificationType => {
    switch (db) {
      case 'preferencial': return 'Prioritário';
      case 'urgente': return 'Urgente';
      default: return 'Normal';
    }
  };

  const addNewCriteria = async () => {
    if (!profile?.unidade_id) return;

    const newId = crypto.randomUUID();
    const newCriteria: Criteria = {
      id: newId,
      name: 'Novo Critério',
      classification: 'Normal',
      rootGroup: {
        id: crypto.randomUUID(),
        logic: 'AND',
        rules: [],
      },
    };

    try {
      const { error } = await supabase
        .from('triagem_criterios')
        .insert([{
          id: newId,
          unidade_id: profile.unidade_id,
          nome: newCriteria.name,
          prioridade: mapUiToDbClassification(newCriteria.classification),
          regras: newCriteria.rootGroup as any,
          ordem: criterias.length,
        }]);

      if (error) throw error;

      setCriterias([...criterias, newCriteria]);
      setEditingId(newId);
      toast.success('Novo critério criado');
    } catch (error: any) {
      console.error('Erro ao criar critério:', error);
      toast.error('Erro ao criar novo critério');
    }
  };

  const updateCriteriaState = (id: string, updates: Partial<Criteria>) => {
    setCriterias(criterias.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const deleteCriteria = async (id: string) => {
    try {
      const { error } = await supabase
        .from('triagem_criterios')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCriterias(criterias.filter((c) => c.id !== id));
      if (editingId === id) setEditingId(null);
      toast.success('Critério removido');
    } catch (error: any) {
      console.error('Erro ao remover critério:', error);
      toast.error('Erro ao remover critério');
    }
  };

  const handleSave = async () => {
    if (!editingId || !profile?.unidade_id) return;
    
    const criteriaToSave = criterias.find(c => c.id === editingId);
    if (!criteriaToSave) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('triagem_criterios')
        .update({
          nome: criteriaToSave.name,
          prioridade: mapUiToDbClassification(criteriaToSave.classification),
          regras: criteriaToSave.rootGroup as any,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingId);

      if (error) throw error;

      toast.success('Critério salvo com sucesso!');
    } catch (error: any) {
      console.error('Erro ao salvar critério:', error);
      toast.error('Erro ao salvar critério');
    } finally {
      setSaving(false);
    }
  };

  const editingCriteria = criterias.find((c) => c.id === editingId);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-sm">Carregando critérios...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-1">
      {/* Sidebar: List of Criterias */}
      <div className="md:col-span-4 space-y-4">
        <Card className="border-none shadow-soft glass">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Critérios</CardTitle>
                <CardDescription className="text-xs">Regras de triagem automática</CardDescription>
              </div>
              <Button size="icon" variant="ghost" onClick={addNewCriteria} className="h-8 w-8 rounded-full bg-primary/10 text-primary">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-2 pb-2">
            <div className="space-y-1">
              {criterias.map((c) => (
                <div 
                  key={c.id}
                  onClick={() => setEditingId(c.id)}
                  className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                    editingId === c.id 
                      ? 'bg-primary/10 border-l-4 border-l-primary' 
                      : 'hover:bg-muted border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex flex-col gap-1 overflow-hidden">
                    <span className="font-semibold text-sm truncate">{c.name}</span>
                    <Badge variant="outline" className={`w-fit text-[9px] px-1.5 py-0 uppercase ${
                      c.classification === 'Urgente' ? 'text-destructive border-destructive/30 bg-destructive/5' :
                      c.classification === 'Prioritário' ? 'text-orange-500 border-orange-500/30 bg-orange-500/5' :
                      'text-success border-success/30 bg-success/5'
                    }`}>
                      {c.classification}
                    </Badge>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={(e) => { e.stopPropagation(); deleteCriteria(c.id); }}
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {criterias.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-xs italic">Nenhum critério criado</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content: Editor */}
      <div className="md:col-span-8">
        {editingCriteria ? (
          <Card className="border-none shadow-soft glass animate-fade-up">
            <CardHeader className="border-b border-border/50 pb-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1 flex-1 max-w-sm">
                    <Label htmlFor="criteria-name" className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Nome do Critério</Label>
                    <Input 
                      id="criteria-name"
                      value={editingCriteria.name}
                      onChange={(e) => updateCriteriaState(editingCriteria.id, { name: e.target.value })}
                      className="h-9 font-medium"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary h-9 gap-2 shadow-glow">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 
                      {saving ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 w-[200px]">
                  <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Classificar como</Label>
                  <Select 
                    value={editingCriteria.classification}
                    onValueChange={(v) => updateCriteriaState(editingCriteria.id, { classification: v as ClassificationType })}
                  >
                    <SelectTrigger className={`h-9 font-semibold ${
                      editingCriteria.classification === 'Urgente' ? 'text-destructive' :
                      editingCriteria.classification === 'Prioritário' ? 'text-orange-500' :
                      'text-success'
                    }`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Normal" className="text-success font-medium">Normal</SelectItem>
                      <SelectItem value="Prioritário" className="text-orange-500 font-medium">Prioritário</SelectItem>
                      <SelectItem value="Urgente" className="text-destructive font-medium">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <LayoutPanelLeft className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold uppercase tracking-wide">Regras Lógicas</h3>
                </div>
                <RuleGroupEditor 
                  group={editingCriteria.rootGroup} 
                  onChange={(updates) => updateCriteriaState(editingCriteria.id, { rootGroup: { ...editingCriteria.rootGroup, ...updates } })}
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="h-full flex flex-col items-center justify-center py-20 text-muted-foreground glass rounded-xl border-none">
            <div className="p-4 rounded-full bg-primary/5 mb-4">
              <ChevronRight className="h-10 w-10 text-primary/40" />
            </div>
            <p className="text-sm font-medium">Selecione ou crie um critério para editar</p>
          </div>
        )}
      </div>
    </div>
  );
};

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-1">
      {/* Sidebar: List of Criterias */}
      <div className="md:col-span-4 space-y-4">
        <Card className="border-none shadow-soft glass">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Critérios</CardTitle>
                <CardDescription className="text-xs">Regras de triagem automática</CardDescription>
              </div>
              <Button size="icon" variant="ghost" onClick={addNewCriteria} className="h-8 w-8 rounded-full bg-primary/10 text-primary">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-2 pb-2">
            <div className="space-y-1">
              {criterias.map((c) => (
                <div 
                  key={c.id}
                  onClick={() => setEditingId(c.id)}
                  className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                    editingId === c.id 
                      ? 'bg-primary/10 border-l-4 border-l-primary' 
                      : 'hover:bg-muted border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex flex-col gap-1 overflow-hidden">
                    <span className="font-semibold text-sm truncate">{c.name}</span>
                    <Badge variant="outline" className={`w-fit text-[9px] px-1.5 py-0 uppercase ${
                      c.classification === 'Urgente' ? 'text-destructive border-destructive/30 bg-destructive/5' :
                      c.classification === 'Prioritário' ? 'text-orange-500 border-orange-500/30 bg-orange-500/5' :
                      'text-success border-success/30 bg-success/5'
                    }`}>
                      {c.classification}
                    </Badge>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={(e) => { e.stopPropagation(); deleteCriteria(c.id); }}
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {criterias.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-xs italic">Nenhum critério criado</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content: Editor */}
      <div className="md:col-span-8">
        {editingCriteria ? (
          <Card className="border-none shadow-soft glass animate-fade-up">
            <CardHeader className="border-b border-border/50 pb-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1 flex-1 max-w-sm">
                    <Label htmlFor="criteria-name" className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Nome do Critério</Label>
                    <Input 
                      id="criteria-name"
                      value={editingCriteria.name}
                      onChange={(e) => updateCriteria(editingCriteria.id, { name: e.target.value })}
                      className="h-9 font-medium"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={handleSave} className="bg-gradient-primary h-9 gap-2 shadow-glow">
                      <Save className="h-4 w-4" /> Salvar
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 w-[200px]">
                  <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Classificar como</Label>
                  <Select 
                    value={editingCriteria.classification}
                    onValueChange={(v) => updateCriteria(editingCriteria.id, { classification: v as ClassificationType })}
                  >
                    <SelectTrigger className={`h-9 font-semibold ${
                      editingCriteria.classification === 'Urgente' ? 'text-destructive' :
                      editingCriteria.classification === 'Prioritário' ? 'text-orange-500' :
                      'text-success'
                    }`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Normal" className="text-success font-medium">Normal</SelectItem>
                      <SelectItem value="Prioritário" className="text-orange-500 font-medium">Prioritário</SelectItem>
                      <SelectItem value="Urgente" className="text-destructive font-medium">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <LayoutPanelLeft className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold uppercase tracking-wide">Regras Lógicas</h3>
                </div>
                <RuleGroupEditor 
                  group={editingCriteria.rootGroup} 
                  onChange={(updates) => updateCriteria(editingCriteria.id, { rootGroup: { ...editingCriteria.rootGroup, ...updates } })}
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="h-full flex flex-col items-center justify-center py-20 text-muted-foreground glass rounded-xl border-none">
            <div className="p-4 rounded-full bg-primary/5 mb-4">
              <ChevronRight className="h-10 w-10 text-primary/40" />
            </div>
            <p className="text-sm font-medium">Selecione ou crie um critério para editar</p>
          </div>
        )}
      </div>
    </div>
  );
};
