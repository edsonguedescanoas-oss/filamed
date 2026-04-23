-- Adiciona colunas para identificação e documentos na tabela pacientes
ALTER TABLE public.pacientes 
ADD COLUMN identificacao_tipo TEXT,
ADD COLUMN identificacao_numero TEXT,
ADD COLUMN documento_url TEXT;

-- Cria o bucket pacientes-documentos para armazenar os documentos anexados
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pacientes-documentos', 'pacientes-documentos', false);

-- Políticas de RLS para o bucket pacientes-documentos
CREATE POLICY "Usuários autenticados podem ver documentos de pacientes" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'pacientes-documentos' AND auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem fazer upload de documentos de pacientes" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'pacientes-documentos' AND auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem atualizar documentos de pacientes" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'pacientes-documentos' AND auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem excluir documentos de pacientes" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'pacientes-documentos' AND auth.role() = 'authenticated');