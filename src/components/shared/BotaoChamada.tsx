import { Button } from "@/components/ui/button";
import { PhoneCall, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Atendimento = Database["public"]["Tables"]["atendimentos"]["Row"];

interface BotaoChamadaProps {
  variant: "tv" | "recepcao";
  calling?: boolean;
  onCall?: () => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

export function BotaoChamada({
  variant,
  calling = false,
  onCall,
  disabled = false,
  className,
  label
}: BotaoChamadaProps) {
  const isTv = variant === "tv";
  
  return (
    <Button
      onClick={onCall}
      disabled={disabled || calling}
      className={cn(
        "w-full shadow-soft transition-all",
        isTv ? "bg-primary hover:bg-primary/90" : "bg-gradient-primary",
        className
      )}
    >
      {calling ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          {isTv ? "Chamando..." : "Chamando próximo..."}
        </>
      ) : (
        <>
          <PhoneCall className="h-4 w-4 mr-2" />
          {label || (isTv ? "Chamar" : "Chamar próximo")}
        </>
      )}
    </Button>
  );
}
