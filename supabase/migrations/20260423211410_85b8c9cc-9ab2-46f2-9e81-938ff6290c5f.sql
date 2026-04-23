DROP POLICY IF EXISTS "bloquear acesso direto a configuracoes internas" ON public.internal_settings;
CREATE POLICY "bloquear acesso direto a configuracoes internas"
ON public.internal_settings
FOR ALL
TO public
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "público lê chamadas recentes" ON public.chamadas;
DROP POLICY IF EXISTS "público lê chamadas recentes sem dados históricos" ON public.chamadas;
CREATE POLICY "público lê chamadas recentes sem dados históricos"
ON public.chamadas
FOR SELECT
TO anon
USING (created_at > now() - interval '5 minutes');

DROP POLICY IF EXISTS "público lê senhas ativas" ON public.senhas;
DROP POLICY IF EXISTS "público lê somente senhas ativas" ON public.senhas;
CREATE POLICY "público lê somente senhas ativas"
ON public.senhas
FOR SELECT
TO anon
USING (status IN ('aguardando'::public.senha_status, 'chamada'::public.senha_status, 'em_atendimento'::public.senha_status));

DROP POLICY IF EXISTS "público lê nome dos pacientes" ON public.pacientes;

DROP POLICY IF EXISTS "Usuários autenticados podem ver documentos de pacientes" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload de documentos de paci" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar documentos de pacientes" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem excluir documentos de pacientes" ON storage.objects;
DROP POLICY IF EXISTS "membros da unidade veem documentos de pacientes" ON storage.objects;
DROP POLICY IF EXISTS "membros da unidade enviam documentos de pacientes" ON storage.objects;
DROP POLICY IF EXISTS "membros da unidade atualizam documentos de pacientes" ON storage.objects;
DROP POLICY IF EXISTS "membros da unidade removem documentos de pacientes" ON storage.objects;

CREATE POLICY "membros da unidade veem documentos de pacientes"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'pacientes-documentos'
  AND public.belongs_to_unidade(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "membros da unidade enviam documentos de pacientes"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pacientes-documentos'
  AND public.belongs_to_unidade(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "membros da unidade atualizam documentos de pacientes"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'pacientes-documentos'
  AND public.belongs_to_unidade(auth.uid(), ((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'pacientes-documentos'
  AND public.belongs_to_unidade(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "membros da unidade removem documentos de pacientes"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'pacientes-documentos'
  AND public.belongs_to_unidade(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "tts cache público para leitura" ON storage.objects;
UPDATE storage.buckets
SET public = false
WHERE id = 'tts-cache';

REVOKE EXECUTE ON FUNCTION public.gerar_senha(uuid, public.senha_prioridade, uuid, text) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.gerar_senha_guiche(uuid, text, text, date, public.senha_prioridade) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.chamar_senha_do_ponto(uuid, uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.encaminhar_do_guiche(uuid, uuid, text, text, public.senha_prioridade) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.finalizar_atendimento_com_retorno(uuid, text, boolean) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.pode_ocupar_ponto(uuid, uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.historico_ponto_atendimento(uuid, uuid, text, timestamptz, timestamptz, integer) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.gerar_senha(uuid, public.senha_prioridade, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gerar_senha_guiche(uuid, text, text, date, public.senha_prioridade) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chamar_senha_do_ponto(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.encaminhar_do_guiche(uuid, uuid, text, text, public.senha_prioridade) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalizar_atendimento_com_retorno(uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pode_ocupar_ponto(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.historico_ponto_atendimento(uuid, uuid, text, timestamptz, timestamptz, integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_unidades_publicas() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_unidade_publica_by_slug(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_senha_por_token(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_senhas_ativas(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_chamadas_recentes(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_chamadas_recentes_detalhadas(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_pacientes_publicos_ativos(uuid) TO anon, authenticated;