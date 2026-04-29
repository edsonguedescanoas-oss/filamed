import React, { useCallback, useState } from 'react';
import ReactFlow, { 
  addEdge, 
  Background, 
  Controls, 
  Connection, 
  Edge, 
  Node,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  NodeProps
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Save, 
  Play, 
  Trash2, 
  Plus, 
  Zap, 
  ArrowRight, 
  Settings2, 
  X,
  MessageSquare,
  Variable,
  Eye
} from 'lucide-react';
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CRM_TRIGGERS } from '@/lib/workflows/triggers';
import { CRM_ACTIONS } from '@/lib/workflows/actions';
import { WadukTemplatePreview } from './WadukTemplatePreview';

const initialNodes: Node[] = [
  {
    id: 'node-1',
    type: 'input',
    data: { label: 'Gatilho: Lead Criado' },
    position: { x: 250, y: 5 },
    style: { background: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: '8px' }
  },
];

const initialEdges: Edge[] = [];

const TriggerNode = ({ data, selected }: NodeProps) => (
  <div className={`px-4 py-3 shadow-lg rounded-xl bg-white border-2 transition-all ${selected ? 'border-sky-500 ring-4 ring-sky-500/20' : 'border-sky-100'} min-w-[200px]`}>
    <div className="flex items-center gap-3">
      <div className="p-2 bg-sky-100 rounded-lg">
        <Zap className="h-5 w-5 text-sky-600" />
      </div>
      <div>
        <div className="text-[10px] font-bold text-sky-500 uppercase tracking-wider">Gatilho</div>
        <div className="text-sm font-semibold text-sky-900">{data.label}</div>
      </div>
    </div>
    <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-sky-500 border-2 border-white" />
  </div>
);

const ActionNode = ({ data, selected }: NodeProps) => (
  <div className={`px-4 py-3 shadow-lg rounded-xl bg-white border-2 transition-all ${selected ? 'border-green-500 ring-4 ring-green-500/20' : 'border-green-100'} min-w-[200px]`}>
    <div className="flex items-center gap-3">
      <div className="p-2 bg-green-100 rounded-lg">
        {data.type === 'enviar_whatsapp_template' ? (
          <MessageSquare className="h-5 w-5 text-green-600" />
        ) : (
          <Play className="h-5 w-5 text-green-600" />
        )}
      </div>
      <div>
        <div className="text-[10px] font-bold text-green-500 uppercase tracking-wider">Ação</div>
        <div className="text-sm font-semibold text-green-900">{data.label}</div>
        {data.config?.template_nome && (
          <div className="text-[10px] text-muted-foreground mt-1 truncate max-w-[120px]">
            {data.config.template_nome}
          </div>
        )}
      </div>
    </div>
    <Handle type="target" position={Position.Top} className="w-3 h-3 bg-green-500 border-2 border-white" />
    <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-green-500 border-2 border-white" />
  </div>
);

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
};

const WorkflowBuilder: React.FC<{ onSave: (config: any) => void }> = ({ onSave }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, string>>({
    "primeiro_nome": "João",
    "unidade": "Clínica Central",
    "link": "https://agende.vc/123"
  });

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  };

  const updateNodeData = (nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      })
    );
  };

  const updateActionConfig = (patch: any) => {
    if (!selectedNode) return;
    const currentConfig = selectedNode.data.config || {};
    const newConfig = { ...currentConfig, ...patch };
    updateNodeData(selectedNode.id, { config: newConfig });
    // Also update label if type changed
    if (patch.type) {
      const actionDef = CRM_ACTIONS.find(a => a.type === patch.type);
      if (actionDef) {
        updateNodeData(selectedNode.id, { label: actionDef.label, type: patch.type });
      }
    }
  };

  const addActionNode = () => {
    const newNode: Node = {
      id: `action-${Date.now()}`,
      type: 'action',
      position: { x: 250, y: nodes.length * 80 + 100 },
      data: { label: 'Nova Ação', type: 'enviar_whatsapp_template', config: {} },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] border rounded-xl overflow-hidden bg-background">
      <div className="p-4 border-b flex justify-between items-center bg-muted/30">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addActionNode} className="gap-2">
            <Plus className="h-4 w-4" /> Add Ação
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            disabled={!selectedNode}
            onClick={() => setSelectedNode(selectedNode)}
          >
            <Settings2 className="h-4 w-4" /> Configurar
          </Button>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-destructive gap-2"
            onClick={() => {
              setNodes(initialNodes);
              setEdges([]);
            }}
          >
            <Trash2 className="h-4 w-4" /> Limpar
          </Button>
          <Button size="sm" onClick={() => onSave({ nodes, edges })} className="gap-2">
            <Save className="h-4 w-4" /> Salvar Workflow
          </Button>
        </div>
      </div>

      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
        
        {/* Templates Panel - Floating */}
        <div className="absolute top-4 right-4 w-64 bg-background/95 backdrop-blur border rounded-lg shadow-xl p-4 z-10">
          <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-3">Templates Sugeridos</h4>
          <div className="space-y-2">
            {[
              { title: "Boas-vindas WhatsApp", desc: "Lead Criado -> Enviar Template" },
              { title: "Reativação Lead Frio", desc: "Sem Interação -> SMS" },
              { title: "Follow-up Proposta", desc: "Proposta Enviada -> Email 2d" }
            ].map((t, i) => (
              <div key={i} className="p-2 border rounded hover:bg-muted cursor-pointer transition-colors group">
                <div className="text-[11px] font-semibold group-hover:text-primary">{t.title}</div>
                <div className="text-[10px] text-muted-foreground truncate">{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Configuration Sidebar */}
      <Sheet open={!!selectedNode} onOpenChange={(open) => !open && setSelectedNode(null)}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Configurar {selectedNode?.type === 'action' ? 'Ação' : 'Gatilho'}
            </SheetTitle>
            <SheetDescription>
              Ajuste os parâmetros para execução em produção.
            </SheetDescription>
          </SheetHeader>

          {selectedNode?.type === 'action' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Tipo de Ação</Label>
                <Select 
                  value={selectedNode.data.type} 
                  onValueChange={(val) => updateActionConfig({ type: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a ação" />
                  </SelectTrigger>
                  <SelectContent>
                    {CRM_ACTIONS.map(a => (
                      <SelectItem key={a.type} value={a.type}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedNode.data.type === 'enviar_whatsapp_template' && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-green-600" />
                      Template WADUK
                    </h4>
                    <Badge variant="outline" className="text-[10px] text-green-600 border-green-200 bg-green-50">
                      WhatsApp Oficial
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="template_nome">Nome do Template (WADUK)</Label>
                    <Input 
                      id="template_nome" 
                      placeholder="ex: boas_vindas_v1"
                      value={selectedNode.data.config?.template_nome || ''}
                      onChange={(e) => updateActionConfig({ template_nome: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="template_content">Conteúdo do Template</Label>
                    <Textarea 
                      id="template_content" 
                      placeholder="Olá {{primeiro_nome}}, bem-vindo à {{unidade}}!"
                      className="min-h-[120px] font-mono text-sm"
                      value={selectedNode.data.config?.template_content || ''}
                      onChange={(e) => updateActionConfig({ template_content: e.target.value })}
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {['{{primeiro_nome}}', '{{unidade}}', '{{link}}'].map(v => (
                        <Badge 
                          key={v} 
                          variant="secondary" 
                          className="text-[10px] cursor-pointer hover:bg-secondary/80"
                          onClick={() => {
                            const current = selectedNode.data.config?.template_content || '';
                            updateActionConfig({ template_content: current + ' ' + v });
                          }}
                        >
                          <Variable className="h-3 w-3 mr-1" /> {v}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">Validação & Preview</Label>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-[10px] gap-1"
                        onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                      >
                        <Eye className="h-3 w-3" /> {isPreviewOpen ? 'Ocultar' : 'Mostrar'}
                      </Button>
                    </div>
                    
                    {isPreviewOpen && (
                      <WadukTemplatePreview 
                        template={selectedNode.data.config?.template_content || ''} 
                        variables={previewData} 
                      />
                    )}
                  </div>
                </div>
              )}

              <div className="pt-6 border-t flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedNode(null)}>Cancelar</Button>
                <Button onClick={() => setSelectedNode(null)}>Salvar Configuração</Button>
              </div>
            </div>
          )}

          {selectedNode?.type !== 'action' && (
            <div className="py-10 text-center text-muted-foreground">
              <Zap className="h-10 w-10 mx-auto mb-4 opacity-20" />
              <p>Configurações do gatilho serão carregadas aqui.</p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default WorkflowBuilder;
