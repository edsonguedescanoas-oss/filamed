-- Adiciona recurso "multi_unidade" aos planos existentes:
-- - starter, pro: false
-- - enterprise: true
UPDATE public.planos
SET recursos = recursos || jsonb_build_object('multi_unidade', false)
WHERE slug IN ('starter','pro')
  AND NOT (recursos ? 'multi_unidade');

UPDATE public.planos
SET recursos = recursos || jsonb_build_object('multi_unidade', true)
WHERE slug = 'enterprise'
  AND NOT (recursos ? 'multi_unidade');