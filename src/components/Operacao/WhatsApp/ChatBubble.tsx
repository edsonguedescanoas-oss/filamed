import React from 'react';
import { cn } from '@/lib/utils';
import { Check, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface Message {
  id: string;
  text: string;
  sender: 'lead' | 'comercial' | 'sistema';
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'pending';
}

interface ChatBubbleProps {
  message: Message;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isLead = message.sender === 'lead';
  const isSystem = message.sender === 'sistema';

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <span className="bg-muted px-3 py-1 rounded-full text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
          {message.text}
        </span>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col mb-4 max-w-[85%]",
      isLead ? "items-start mr-auto" : "items-end ml-auto"
    )}>
      <div className={cn(
        "px-3 py-2 rounded-2xl text-sm relative",
        isLead 
          ? "bg-white border border-border rounded-tl-none text-foreground" 
          : "bg-primary text-primary-foreground rounded-tr-none shadow-sm"
      )}>
        {message.text}
        
        <div className={cn(
          "flex items-center gap-1 justify-end mt-1 text-[10px]",
          isLead ? "text-muted-foreground" : "text-primary-foreground/70"
        )}>
          {format(new Date(message.timestamp), "HH:mm", { locale: ptBR })}
          
          {!isLead && (
            <span className="ml-1">
              {message.status === 'pending' && <span className="animate-pulse">...</span>}
              {message.status === 'sent' && <Check className="h-3 w-3" />}
              {message.status === 'delivered' && <CheckCheck className="h-3 w-3" />}
              {message.status === 'read' && <CheckCheck className="h-3 w-3 text-blue-300" />}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export const TypingIndicator = () => (
  <div className="flex items-center gap-1 px-3 py-2 bg-muted/30 rounded-full w-fit mb-4">
    <div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
    <div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
    <div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    <span className="text-[10px] text-muted-foreground ml-2">Lead digitando...</span>
  </div>
);

export default ChatBubble;
