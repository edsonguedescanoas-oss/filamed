 import { createFileRoute } from "@tanstack/react-router";
 import { useEffect, useState } from "react";
 import {
   Activity,
   Plus,
   Trash2,
   Save,
   GripVertical,
   AlertCircle,
   Check,
   Loader2,
 } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/hooks/use-auth";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
 import { toast } from "sonner";
 import { RoleGuard } from "@/components/role-guard";
 import type { Database } from "@/integrations/supabase/types";
 
 type TriageCriterion = Database["public"]["Tables"]["triagem_criterios"]["Row"];
 type Prioridade = Database["public"]["Enums"]["senha_prioridade"];
 
 export const Route = createFileRoute("/_app/app/triagem")({
   head: () => ({ meta: [{ title: "Configuração de Triagem — FilaMed" }] }),
   component: () => (
     <RoleGuard allow={["admin"]} path="/app/triagem">
       <TriagemConfigPage />
     </RoleGuard>
   ),
 });
 
 function TriagemConfigPage() {
   const { profile } = useAuth();
   const unidadeId = profile?.unidade_id;
   const [criterios, setCriterios] = useState<TriageCriterion[]>([]);
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
 
   const fetchCriterios = async () => {
     if (!unidadeId) return;
     setLoading(true);
     const { data, error } = await supabase
       .from("triagem_criterios")
       .select("*")
       .eq("unidade_id", unidadeId)
       .order("ordem", { ascending: true });
 
     if (error) {
       toast.error("Erro ao carregar critérios: " + error.message);
     } else {
       setCriterios(data || []);
     }
     setLoading(false);
   };
 
   useEffect(() => {
     void fetchCriterios();
   }, [unidadeId]);
 
   const handleAdd = () => {
     if (!unidadeId) return;
     const newCriterion: Partial<TriageCriterion> = {
       unidade_id: unidadeId,
       nome: "",
       prioridade: "normal",
       ativo: true,
       ordem: criterios.length,
     };
     setCriterios([...criterios, newCriterion as TriageCriterion]);
   };
 
   const handleRemove = async (index: number, id?: string) => {
     if (id) {
       const { error } = await supabase.from("triagem_criterios").delete().eq("id", id);
       if (error) {
         toast.error("Erro ao remover: " + error.message);
         return;
       }
     }
     const next = [...criterios];
     next.splice(index, 1);
     setCriterios(next);
     toast.success("Critério removido");
   };
 
   const handleUpdate = (index: number, updates: Partial<TriageCriterion>) => {
     const next = [...criterios];
     next[index] = { ...next[index], ...updates };
     setCriterios(next);
   };
 
   const handleSave = async () => {
     if (!unidadeId) return;
     setSaving(true);
     try {
       // Validate
       if (criterios.some((c) => !c.nome.trim())) {
         throw new Error("Todos os critérios devem ter um nome");
       }
 
       const toUpsert = criterios.map((c, i) => ({
         ...c,
         ordem: i,
         unidade_id: unidadeId,
       }));
 
       const { error } = await supabase.from("triagem_criterios").upsert(toUpsert);
       if (error) throw error;
 
       toast.success("Configurações salvas com sucesso");
       void fetchCriterios();
     } catch (err) {
       toast.error(err instanceof Error ? err.message : "Erro ao salvar");
     } finally {
       setSaving(false);
     }
   };
 
   return (
     <div className="mx-auto max-w-[1000px] px-6 py-8">
       <div className="flex items-start justify-between gap-4 mb-8">
         <div>
           <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
             Configurações
           </p>
           <h1 className="mt-1 font-display text-3xl font-bold">Matriz de Classificação</h1>
           <p className="mt-1 text-sm text-muted-foreground">
             Defina os critérios de triagem que serão exibidos na recepção para classificar o atendimento.
           </p>
         </div>
         <Button onClick={handleSave} disabled={saving || loading} className="bg-gradient-primary">
           {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
           Salvar alterações
         </Button>
       </div>
 
       <Card>
         <CardHeader>
           <CardTitle className="text-lg flex items-center gap-2">
             <Activity className="h-5 w-5 text-primary" />
             Critérios de Triagem
           </CardTitle>
           <CardDescription>
             Se múltiplos critérios forem selecionados, a maior prioridade será aplicada.
           </CardDescription>
         </CardHeader>
         <CardContent>
           {loading ? (
             <div className="py-12 flex justify-center">
               <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
             </div>
           ) : (
             <div className="space-y-4">
               {criterios.length === 0 ? (
                 <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                   <p className="text-sm text-muted-foreground mb-4">
                     Nenhum critério configurado ainda.
                   </p>
                   <Button variant="outline" onClick={handleAdd}>
                     <Plus className="h-4 w-4" />
                     Adicionar primeiro critério
                   </Button>
                 </div>
               ) : (
                 <div className="space-y-3">
                   {criterios.map((c, i) => (
                     <div
                       key={c.id || `new-${i}`}
                       className="group flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:border-primary/40 transition-colors"
                     >
                       <div className="cursor-grab text-muted-foreground">
                         <GripVertical className="h-4 w-4" />
                       </div>
                       
                       <div className="flex-1 grid gap-3 sm:grid-cols-[1fr_200px]">
                         <div>
                           <Input
                             placeholder="Ex: Idade >= 60 anos, Febre, Gestante..."
                             value={c.nome}
                             onChange={(e) => handleUpdate(i, { nome: e.target.value })}
                             className="h-9"
                           />
                         </div>
                         <div className="flex items-center gap-2">
                           <Select
                             value={c.prioridade}
                             onValueChange={(v) => handleUpdate(i, { prioridade: v as Prioridade })}
                           >
                             <SelectTrigger className="h-9">
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="normal">Normal</SelectItem>
                               <SelectItem value="preferencial">Prioritário</SelectItem>
                               <SelectItem value="urgente">Urgente</SelectItem>
                             </SelectContent>
                           </Select>
                           <Button
                             variant="ghost"
                             size="icon"
                             className="h-9 w-9 text-destructive hover:bg-destructive/10"
                             onClick={() => handleRemove(i, c.id)}
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         </div>
                       </div>
                     </div>
                   ))}
                   <Button variant="outline" onClick={handleAdd} className="w-full border-dashed">
                     <Plus className="h-4 w-4" />
                     Adicionar critério
                   </Button>
                 </div>
               )}
             </div>
           )}
         </CardContent>
       </Card>
 
       <div className="mt-8 rounded-xl bg-primary/5 border border-primary/10 p-4">
         <div className="flex gap-3">
           <AlertCircle className="h-5 w-5 text-primary shrink-0" />
           <div className="text-sm">
             <h4 className="font-semibold text-primary">Como funciona?</h4>
             <p className="mt-1 text-muted-foreground leading-relaxed">
               Estes critérios aparecerão como botões de seleção na tela de Recepção.
               Ao selecionar um ou mais critérios, o sistema classificará automaticamente
               a senha do paciente de acordo com a regra de maior impacto.
             </p>
           </div>
         </div>
       </div>
     </div>
   );
 }