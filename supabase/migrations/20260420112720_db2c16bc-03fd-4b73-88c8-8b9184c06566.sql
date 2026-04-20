-- Remove a policy anon na tabela unidades — anon agora SÓ acessa via RPC.
DROP POLICY IF EXISTS "anon lê unidades ativas (colunas restritas via grant)" ON public.unidades;

-- Revoga qualquer SELECT residual para anon
REVOKE SELECT ON public.unidades FROM anon;
REVOKE SELECT (id, nome, slug, ativo) ON public.unidades FROM anon;