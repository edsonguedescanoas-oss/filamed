import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar as CalendarIcon, CheckCircle2, Video, Globe } from 'lucide-react';
import { format, addDays, startOfToday, setHours, setMinutes, isBefore, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'
];

interface SchedulerProps {
  leadId?: string;
}

const Scheduler: React.FC<SchedulerProps> = ({ leadId }) => {
  const [date, setDate] = useState<Date | undefined>(addDays(startOfToday(), 1));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [step, setStep] = useState<'datetime' | 'confirm' | 'success'>('datetime');
  const [loading, setLoading] = useState(false);

  const handleSchedule = async () => {
    if (!date || !selectedTime || !leadId) {
      toast.error("Por favor, selecione data e horário.");
      return;
    }

    setLoading(true);
    try {
      const [hours, minutes] = selectedTime.split(':');
      const scheduleDate = setMinutes(setHours(date, parseInt(hours)), parseInt(minutes));

      const { error } = await supabase.from('demonstracoes').insert({
        lead_id: leadId,
        data_hora: scheduleDate.toISOString(),
        status: 'agendada',
        link_videochamada: `https://meet.filamed.com.br/demo-${Math.random().toString(36).substring(7)}`
      });

      if (error) throw error;

      setStep('success');
      toast.success("Demonstração agendada com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao agendar", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <Card className="max-w-md mx-auto text-center p-8 animate-in fade-in zoom-in duration-300">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
        </div>
        <CardTitle className="text-2xl mb-2">Tudo pronto!</CardTitle>
        <CardDescription className="text-base mb-6">
          Sua demonstração foi agendada. Enviamos os detalhes para o seu WhatsApp e e-mail.
        </CardDescription>
        <div className="bg-muted p-4 rounded-lg text-left mb-6 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <CalendarIcon className="h-4 w-4 text-primary" />
            <span className="font-medium">
              {format(date!, "dd 'de' MMMM", { locale: ptBR })} às {selectedTime}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Video className="h-4 w-4 text-primary" />
            <span className="font-medium">Videochamada (Link enviado)</span>
          </div>
        </div>
        <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
          Agendar outra data
        </Button>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto items-start">
      {/* Left: Info & Calendar */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2 text-primary mb-2">
            <Video className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Apresentação do Sistema</span>
          </div>
          <CardTitle className="text-2xl font-bold">Agende sua Demonstração</CardTitle>
          <CardDescription>
            Escolha o melhor dia para conhecer como a Filamed pode transformar sua clínica.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" /> 45 min
            </div>
            <div className="flex items-center gap-1">
              <Globe className="h-4 w-4" /> Brasília (GMT-3)
            </div>
          </div>
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            disabled={(date) => isBefore(date, startOfToday())}
            className="rounded-md border shadow-sm mx-auto"
            locale={ptBR}
          />
        </CardContent>
      </Card>

      {/* Right: Time Selection */}
      <div className="space-y-6">
        {date && (
          <div className="animate-in slide-in-from-right duration-300">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Horários disponíveis para {format(date, "dd 'de' MMMM", { locale: ptBR })}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {TIME_SLOTS.map((time) => (
                <Button
                  key={time}
                  variant={selectedTime === time ? "default" : "outline"}
                  className={cn(
                    "h-12 text-base font-medium transition-all",
                    selectedTime === time && "ring-2 ring-primary ring-offset-2"
                  )}
                  onClick={() => setSelectedTime(time)}
                >
                  {time}
                </Button>
              ))}
            </div>
          </div>
        )}

        {selectedTime && (
          <div className="animate-in fade-in slide-in-from-bottom duration-500 pt-4">
            <Button 
              className="w-full h-14 text-lg font-bold gap-2 shadow-xl" 
              onClick={handleSchedule}
              disabled={loading}
            >
              {loading ? "Agendando..." : "Confirmar Agendamento"}
              <ArrowRight className="h-5 w-5" />
            </Button>
            <p className="text-[10px] text-center text-muted-foreground mt-4">
              Ao confirmar, você receberá um lembrete via WhatsApp e E-mail.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

function ArrowRight(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export default Scheduler;
