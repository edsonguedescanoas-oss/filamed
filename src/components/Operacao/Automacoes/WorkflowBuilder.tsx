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

const TriggerNode = ({ data }: any) => (
  <div className="px-4 py-2 shadow-md rounded-md bg-sky-50 border-2 border-sky-500 min-w-[150px]">
    <div className="flex items-center gap-2">
      <Zap className="h-4 w-4 text-sky-600" />
      <div className="text-xs font-bold text-sky-900">{data.label}</div>
    </div>
    <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-sky-500" />
  </div>
);

const ActionNode = ({ data }: any) => (
  <div className="px-4 py-2 shadow-md rounded-md bg-green-50 border-2 border-green-500 min-w-[150px]">
    <div className="flex items-center gap-2">
      <Play className="h-4 w-4 text-green-600" />
      <div className="text-xs font-bold text-green-900">{data.label}</div>
    </div>
    <Handle type="target" position={Position.Top} className="w-3 h-3 bg-green-500" />
    <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-green-500" />
  </div>
);

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
};

const WorkflowBuilder: React.FC<{ onSave: (config: any) => void }> = ({ onSave }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addActionNode = () => {
    const newNode: Node = {
      id: `action-${nodes.length + 1}`,
      type: 'action',
      position: { x: Math.random() * 400, y: nodes.length * 100 },
      data: { label: 'Nova Ação' },
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
          <Button variant="outline" size="sm" className="gap-2">
            <Settings2 className="h-4 w-4" /> Configurar
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="text-destructive gap-2">
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
    </div>
  );
};

export default WorkflowBuilder;
