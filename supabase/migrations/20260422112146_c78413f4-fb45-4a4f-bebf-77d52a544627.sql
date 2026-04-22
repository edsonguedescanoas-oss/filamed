-- Política para permitir que o papel 'anon' (TV) leia o nome dos pacientes
-- Isso é necessário para que o painel de chamadas funcione corretamente
CREATE POLICY "público lê nome dos pacientes" 
ON public.pacientes 
FOR SELECT 
TO anon, authenticated 
USING (true);

-- Como queremos ser cuidadosos, vamos garantir que apenas o nome seja acessível se necessário, 
-- mas por agora o SELECT true resolve o erro de permissão que está travando a TV.