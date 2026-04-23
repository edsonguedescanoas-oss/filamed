-- Function to notify when a ticket is called
CREATE OR REPLACE FUNCTION public.notify_called_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  _user_id text;
  _mesa_nome text;
BEGIN
  -- Only trigger if status changed to 'chamada'
  IF (NEW.status = 'chamada' AND (OLD.status IS NULL OR OLD.status <> 'chamada')) THEN
    
    -- Extract user ID from JWT if available
    BEGIN
      _user_id := (current_setting('request.jwt.claims', true)::jsonb)->>'sub';
    EXCEPTION WHEN OTHERS THEN
      _user_id := 'unauthenticated';
    END;

    -- Try to find the mesa/local name
    -- Assuming there might be a relation or a way to identify where it was called from
    -- For now we can pass NEW.mesa_id or similar if it exists
    -- Let's check if 'chamado_por' or 'mesa_id' exists in 'senhas'
    
    PERFORM
      net.http_post(
        url := 'https://bccvpirrqwhqsinlmpth.supabase.co/functions/v1/wa-duck-notify',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || coalesce(_user_id, 'system')
        ),
        body := jsonb_build_object(
          'senha_id', NEW.id,
          'tipo', 'chamada'
        )::text
      );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for ticket being called
DROP TRIGGER IF EXISTS tr_on_called_ticket ON public.senhas;
CREATE TRIGGER tr_on_called_ticket
AFTER UPDATE ON public.senhas
FOR EACH ROW
WHEN (NEW.status = 'chamada' AND OLD.status <> 'chamada')
EXECUTE FUNCTION public.notify_called_ticket();