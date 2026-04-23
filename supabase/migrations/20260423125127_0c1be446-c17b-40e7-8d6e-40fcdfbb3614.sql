-- Remove a FK antiga se existir (preciso descobrir o nome ou apenas forçar uma nova)
-- Como acabei de criar, posso dar um drop column e add de novo ou apenas alter
ALTER TABLE public.senhas DROP COLUMN criado_por;
ALTER TABLE public.senhas ADD COLUMN criado_por UUID REFERENCES public.profiles(id);
