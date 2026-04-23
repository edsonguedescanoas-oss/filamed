-- Function to call the edge function
CREATE OR REPLACE FUNCTION public.notify_new_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Invoca a Edge Function de forma assíncrona
  PERFORM
    net.http_post(
      url := 'https://bccvpirrqwhqsinlmpth.supabase.co/functions/v1/wa-duck-notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('request.jwt.claims', true)::jsonb->>'sub' -- O ideal seria service role, mas trigger roda com role do user
      ),
      body := jsonb_build_object('senha_id', NEW.id)
    );
  RETURN NEW;
END;
$$;

-- Trigger
DROP TRIGGER IF EXISTS tr_on_new_ticket ON public.senhas;
CREATE TRIGGER tr_on_new_ticket
AFTER INSERT ON public.senhas
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_ticket();
