-- Bucket público para cache de áudios TTS gerados.
-- Chamadas de senha são curtas e repetitivas ("Senha A001, guichê 3"),
-- então cachear evita custo desnecessário com ElevenLabs/Google TTS.
INSERT INTO storage.buckets (id, name, public)
VALUES ('tts-cache', 'tts-cache', true)
ON CONFLICT (id) DO NOTHING;

-- Leitura pública (URLs do cache podem ser tocadas direto pelo painel TV anônimo).
CREATE POLICY "tts cache público para leitura"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'tts-cache');

-- Apenas o service_role (usado pela edge function) escreve.
-- Não criamos policy de INSERT/UPDATE para anon/authenticated — só a edge function escreve.