-- ─── Configuração do Bucket para Upload de Fotos ───────────────────────────
-- Cria o bucket 'pedidos-fotos' e aplica as políticas de segurança (RLS)
-- para permitir que o painel envie as fotos tiradas pelo celular.

-- 1. Cria o bucket (se não existir) e garante que ele seja público
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pedidos-fotos', 'pedidos-fotos', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Permite que qualquer usuário autenticado (logado no ERP) faça upload de imagens
DROP POLICY IF EXISTS "permitir_upload_auth" ON storage.objects;
CREATE POLICY "permitir_upload_auth" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'pedidos-fotos' AND auth.role() = 'authenticated');

-- 3. Permite que qualquer pessoa ou sistema leia (visualize) as imagens salvas
DROP POLICY IF EXISTS "permitir_leitura_publica" ON storage.objects;
CREATE POLICY "permitir_leitura_publica" ON storage.objects
  FOR SELECT USING (bucket_id = 'pedidos-fotos');

-- 4. Permite que usuários autenticados atualizem (substituam) as imagens
DROP POLICY IF EXISTS "permitir_update_auth" ON storage.objects;
CREATE POLICY "permitir_update_auth" ON storage.objects
  FOR UPDATE USING (bucket_id = 'pedidos-fotos' AND auth.role() = 'authenticated');

-- 5. Permite que usuários autenticados apaguem as imagens
DROP POLICY IF EXISTS "permitir_delete_auth" ON storage.objects;
CREATE POLICY "permitir_delete_auth" ON storage.objects
  FOR DELETE USING (bucket_id = 'pedidos-fotos' AND auth.role() = 'authenticated');
