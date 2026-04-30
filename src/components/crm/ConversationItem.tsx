import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

const safeFormat = (date: any, formatStr: string) => {
  if (!date) return "";
  const d = new Date(date);
  if (!isValid(d)) return "";
  return format(d, formatStr, { locale: ptBR });
};

interface ConversationItemProps {
  conversa: any;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export const ConversationItem = React.memo(({ conversa, isSelected, onSelect }: ConversationItemProps) => {
  return (
    <button
      onClick={() => onSelect(conversa.id)}
      className={cn(
        "w-full p-4 flex gap-4 text-left transition-all duration-200 outline-none focus-visible:bg-muted/80",
        isSelected 
          ? "bg-accent/40 shadow-[inset_4px_0_0_0_var(--primary)]" 
          : "hover:bg-muted/40 active:bg-muted/60"
      )}
      aria-selected={isSelected}
    >
      <div className="relative shrink-0">
        <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
          <AvatarFallback className="bg-gradient-primary text-primary-foreground font-bold">
            {conversa.contato?.nome?.[0] || "C"}
          </AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-success" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-bold text-sm truncate text-foreground group-hover:text-primary transition-colors">
            {conversa.contato?.nome || "Sem Nome"}
          </span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
            {conversa.ultima_mensagem_at && safeFormat(conversa.ultima_mensagem_at, "HH:mm")}
          </span>
        </div>
        <p className="text-xs text-muted-foreground/80 truncate leading-normal">
          {conversa.ultima_mensagem_preview || "Nenhuma mensagem enviada"}
        </p>
        <div className="mt-2 flex items-center gap-2">
           <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-bold uppercase tracking-wider bg-muted/60">
            {conversa.status}
           </Badge>
           {conversa.agente && (
             <span className="text-[9px] text-muted-foreground font-medium flex items-center gap-1">
               <User className="h-2.5 w-2.5 opacity-60" />
               {conversa.agente.nome}
             </span>
           )}
        </div>
      </div>
    </button>
  );
});

ConversationItem.displayName = "ConversationItem";
