import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  variant?: "danger";
}

export function AdminStatCard({ label, value, variant }: StatCardProps) {
  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-4 sm:p-6">
        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground/80">
          {label}
        </p>
        <p
          className={cn(
            "mt-1 sm:mt-2 text-2xl sm:text-3xl font-black tracking-tight",
            variant === "danger" && (typeof value === 'number' ? value > 0 : true) ? "text-destructive" : "text-foreground"
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
