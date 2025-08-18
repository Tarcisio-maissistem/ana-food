-- Script para configurar permissões do Supabase Storage para logos
-- Execute este script no SQL Editor do Supabase

-- 1. Criar o bucket 'cariberestarante' se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cariberestarante',
  'cariberestarante',
  true,
  5242880, -- 5MB em bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Política para permitir SELECT (visualizar) logos
CREATE POLICY "Permitir visualizar logos" ON storage.objects
FOR SELECT USING (bucket_id = 'cariberestarante');

-- 3. Política para permitir INSERT (upload) de logos
CREATE POLICY "Permitir upload de logos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'cariberestarante' 
  AND (storage.foldername(name))[1] = 'logos'
  AND auth.role() = 'authenticated'
);

-- 4. Política para permitir UPDATE (atualizar) logos
CREATE POLICY "Permitir atualizar logos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'cariberestarante' 
  AND (storage.foldername(name))[1] = 'logos'
  AND auth.role() = 'authenticated'
);

-- 5. Política para permitir DELETE (excluir) logos
CREATE POLICY "Permitir excluir logos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'cariberestarante' 
  AND (storage.foldername(name))[1] = 'logos'
  AND auth.role() = 'authenticated'
);

-- 6. Habilitar RLS no bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 7. Criar função para limpar logos antigos (opcional)
CREATE OR REPLACE FUNCTION clean_old_logos()
RETURNS void AS $$
BEGIN
  -- Remove logos com mais de 30 dias sem uso
  DELETE FROM storage.objects 
  WHERE bucket_id = 'cariberestarante' 
    AND (storage.foldername(name))[1] = 'logos'
    AND updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Comentários para documentação
COMMENT ON POLICY "Permitir visualizar logos" ON storage.objects IS 
'Permite que qualquer usuário visualize as logos do bucket cariberestarante';

COMMENT ON POLICY "Permitir upload de logos" ON storage.objects IS 
'Permite que usuários autenticados façam upload de logos na pasta logos/';

COMMENT ON POLICY "Permitir atualizar logos" ON storage.objects IS 
'Permite que usuários autenticados atualizem logos existentes na pasta logos/';

COMMENT ON POLICY "Permitir excluir logos" ON storage.objects IS 
'Permite que usuários autenticados excluam logos na pasta logos/';
