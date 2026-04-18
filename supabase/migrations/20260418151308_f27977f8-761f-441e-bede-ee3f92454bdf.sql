
ALTER TABLE public.senhas REPLICA IDENTITY FULL;
ALTER TABLE public.chamadas REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.senhas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chamadas;
