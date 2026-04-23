CREATE OR REPLACE FUNCTION public.notify_new_ticket()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net'
AS $function$
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
  -- We send a placeholder if no user is authenticated
  PERFORM
    net.http_post(
      url := 'https://bccvpirrqwhqsinlmpth.supabase.co/functions/v1/wa-duck-notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(_user_id, 'system')
      ),
      body := jsonb_build_object('senha_id', NEW.id)
    ) ;
    
  RETURN NEW;
END;
$function$;

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
      _user_id := NULL;
    END;

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
        )
      );
  END IF;
  
  RETURN NEW;
END;
$$;
