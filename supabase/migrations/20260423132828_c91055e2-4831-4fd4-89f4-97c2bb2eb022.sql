CREATE OR REPLACE FUNCTION public.notify_called_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  _user_id text;
BEGIN
  -- Only trigger if status changed to 'chamada'
  IF (NEW.status = 'chamada' AND (OLD.status IS NULL OR OLD.status <> 'chamada')) THEN
    
    -- Extract user ID from JWT if available
    BEGIN
      _user_id := (current_setting('request.jwt.claims', true)::jsonb)->>'sub';
    EXCEPTION WHEN OTHERS THEN
      _user_id := 'unauthenticated';
    END;

    PERFORM
      net.http_post(
        url := 'https://bccvpirrqwhqsinlmpth.supabase.co/functions/v1/wa-duck-notify'::text,
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