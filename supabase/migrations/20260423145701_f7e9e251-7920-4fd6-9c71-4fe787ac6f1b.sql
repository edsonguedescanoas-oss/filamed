-- Create a table for atomic locks
CREATE TABLE IF NOT EXISTS public.atomic_locks (
    key TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Enable RLS
ALTER TABLE public.atomic_locks ENABLE ROW LEVEL SECURITY;

-- No policies needed as we'll use service_role, but let's add one for safety if ever accessed by users
CREATE POLICY "Only service role can manage locks" ON public.atomic_locks
    USING (false)
    WITH CHECK (false);

-- Function to cleanup expired locks
CREATE OR REPLACE FUNCTION public.cleanup_expired_locks()
RETURNS void AS $$
BEGIN
    DELETE FROM public.atomic_locks WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;
