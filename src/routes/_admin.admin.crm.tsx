import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { RoleGuard } from "@/components/role-guard";
import { ChatInterface } from "@/components/crm/chat-interface";
import { AgentConfig } from "@/components/crm/agent-config";
import { CRMSettings } from "@/components/crm/crm-settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Users, Settings } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/crm")({
  component: () => (
    <RoleGuard permission="manage_users" path="/admin/crm">
      <CRMPage />
    </RoleGuard>
  ),
});

function CRMPage() {
  const [activeTab, setActiveTab] = useState("chat");

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <div className="px-6 py-4 border-b bg-background flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CRM Atendimento</h1>
          <p className="text-sm text-muted-foreground">Gerencie conversas via WhatsApp e agentes de suporte.</p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[500px]">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Mensagens
            </TabsTrigger>
            <TabsTrigger value="agents" className="gap-2">
              <Users className="h-4 w-4" />
              Agentes (GHL)
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Configuração
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === "chat" && (
          <ChatInterface />
        )}
        {activeTab === "agents" && (
          <div className="p-6 max-w-4xl mx-auto h-full overflow-y-auto">
             <AgentConfig />
          </div>
        )}
        {activeTab === "settings" && (
          <div className="p-6 max-w-4xl mx-auto h-full overflow-y-auto">
             <CRMSettings />
          </div>
        )}
      </div>
    </div>
  );
}
