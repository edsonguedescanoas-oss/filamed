-- Atualiza notify_new_ticket
CREATE OR REPLACE FUNCTION public.notify_new_ticket()
RETURNS TRIGGER AS $$
DECLARE
  _jwt_claims text;
  _user_id text;
BEGIN
  _jwt_claims := current_setting('request.jwt.claims', true);
  
  IF _jwt_claims IS NOT NULL AND _jwt_claims <> '' THEN
    BEGIN
      _user_id := (_jwt_claims::jsonb)->>'sub';
    EXCEPTION WHEN OTHERS THEN
      _user_id := NULL;
    END;
  END IF;

  PERFORM
    net.http_post(
      url := 'https://bccvpirrqwhqsinlmpth.supabase.co/functions/v1/wa-duck-notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(_user_id, 'system')
      ),
      body := jsonb_build_object(
        'senha_id', NEW.id,
        'tipo', 'criacao',
        'idempotency_key', NEW.id::text || '_criacao'
      )
    ) ;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Atualiza notify_called_ticket
CREATE OR REPLACE FUNCTION public.notify_called_ticket()
RETURNS TRIGGER AS $$
DECLARE
  _user_id text;
BEGIN
  IF (NEW.status = 'chamada' AND (OLD.status IS NULL OR OLD.status <> 'chamada')) THEN
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
          'tipo', 'chamada',
          'idempotency_key', NEW.id::text || '_chamada'
        )
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;