-- ─── Acervo de Quadros Prontos — Casa Linda ───────────────────────────────────
-- Quadros finalizados disponíveis no salão (gravações, devoluções, etc.)
-- Ficam salvos permanentemente; quando marcado como 'vendido', sai do acervo ativo.

CREATE TABLE IF NOT EXISTS acervo_quadros (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  produto     text NOT NULL,              -- nome/descrição do quadro (ex: "Árvore da Vida em Canvas")
  tamanho     text,                       -- ex: "115x115 cm", "145x95 cm"
  moldura     text,                       -- ex: "Caixa Preta", "Sem Moldura"
  acabamento  text,                       -- ex: "Com Vidro", "Sem Vidro"
  categoria   text,                       -- ex: "Abstrato", "Floral", "Paisagem"
  foto_url    text,                       -- URL da foto do quadro (Supabase Storage)
  obs         text,                       -- observações internas
  origem      text DEFAULT 'Acervo',      -- ex: "Gravação", "Devolução", "Amostra"
  status      text DEFAULT 'disponivel'   -- 'disponivel' | 'vendido'
    CHECK (status IN ('disponivel', 'vendido')),
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL
);

-- Índices para filtros rápidos
CREATE INDEX IF NOT EXISTS acervo_quadros_status_idx    ON acervo_quadros (status);
CREATE INDEX IF NOT EXISTS acervo_quadros_categoria_idx ON acervo_quadros (categoria);
CREATE INDEX IF NOT EXISTS acervo_quadros_tamanho_idx   ON acervo_quadros (tamanho);
CREATE INDEX IF NOT EXISTS acervo_quadros_created_idx   ON acervo_quadros (created_at DESC);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_acervo_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_acervo_updated_at ON acervo_quadros;
CREATE TRIGGER set_acervo_updated_at
  BEFORE UPDATE ON acervo_quadros
  FOR EACH ROW EXECUTE FUNCTION update_acervo_updated_at();

-- RLS: todos os usuários autenticados podem ler; qualquer autenticado pode inserir/atualizar/deletar
ALTER TABLE acervo_quadros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "acervo_select" ON acervo_quadros;
CREATE POLICY "acervo_select" ON acervo_quadros
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "acervo_insert" ON acervo_quadros;
CREATE POLICY "acervo_insert" ON acervo_quadros
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "acervo_update" ON acervo_quadros;
CREATE POLICY "acervo_update" ON acervo_quadros
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "acervo_delete" ON acervo_quadros;
CREATE POLICY "acervo_delete" ON acervo_quadros
  FOR DELETE USING (auth.role() = 'authenticated');
