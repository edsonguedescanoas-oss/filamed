-- Update the function to safely handle missing JWT claims
CREATE OR REPLACE FUNCTION public.notify_new_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  _jwt_claims text;
  _user_id text;
BEGIN
  -- Safely get the JWT claims
  _jwt_claims := current_setting('request.jwt.claims', true);
  
  -- Extract sub if claims exist and are valid JSON
  IF _jwt_claims IS NOT NULL AND _jwt_claims <> '' THEN
    BEGIN
      _user_id := (_jwt_claims::jsonb)->>'sub';
    EXCEPTION WHEN OTHERS THEN
      _user_id := NULL;
    END;
  END IF;

  -- Invoke the Edge Function asynchronously
  -- We send a placeholder if no user is authenticated to avoid invalid header values
  PERFORM
    net.http_post(
      url := 'https://bccvpirrqwhqsinlmpth.supabase.co/functions/v1/wa-duck-notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(_user_id, 'unauthenticated')
      ),
      body := jsonb_build_object('senha_id', NEW.id)
    ) ;
    
  RETURN NEW;
END;
$$;