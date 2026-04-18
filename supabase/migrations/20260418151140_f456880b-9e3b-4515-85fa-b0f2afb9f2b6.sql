
-- Permite ao público ler informações públicas das unidades ativas (necessário para o painel de TV /tv/$slug)
CREATE POLICY "público lê unidades ativas"
ON public.unidades
FOR SELECT
TO anon
USING (ativo = true);
