-- ============================================================
-- MIGRATION: catalogo_tapetes_lv
-- Catálogo completo de tapetes da Lar e Vida com estoque,
-- imagens e dados comerciais.
--
-- INSTRUÇÕES:
-- 1. Abra o Supabase Dashboard → SQL Editor
-- 2. Cole este script e clique em "Run"
-- 3. Vá em Storage → New Bucket:
--    Nome: tapetes-lv | Public: YES | Max size: 5MB | MIME: image/*
-- ============================================================

-- ── 1. Tabela Principal ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.catalogo_tapetes_lv (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação
  codigo            TEXT,                          -- código interno (ex: 000218.006.002)
  ean               TEXT,                          -- código de barras EAN-13
  nome              TEXT        NOT NULL,          -- nome comercial (ex: NAKURU)
  colecao           TEXT,                          -- coleção (ex: NAKURU, MOJAVE, KALAHARI)
  linha             TEXT        CHECK (linha IN ('RIOS', 'LAGOS', 'OUTRO')),
  tamanho           TEXT,                          -- ex: 2,00m x 3,00m
  largura_cm        NUMERIC(8,2),                  -- largura em cm
  comprimento_cm    NUMERIC(8,2),                  -- comprimento em cm
  desenho           TEXT,                          -- ex: DS-02, Desenho 04
  cor_predominante  TEXT,                          -- ex: Bege, Cinza, Terracota, Azul
  material          TEXT,                          -- ex: Polipropileno, Viscose, Lã
  origem            TEXT        DEFAULT 'Nacional',-- Nacional / Importado

  -- Comercial
  fornecedor        TEXT        NOT NULL DEFAULT 'Tellaio',
  codigo_fornecedor TEXT,                          -- referência no fornecedor
  preco_custo       NUMERIC(12,2),                 -- preço de custo R$
  preco_venda       NUMERIC(12,2),                 -- preço de venda sugerido R$

  -- Estoque
  quantidade        INTEGER     NOT NULL DEFAULT 0,
  quantidade_minima INTEGER     NOT NULL DEFAULT 2,
  localizacao       TEXT,                          -- ex: Prateleira A3, Depósito 2

  -- Mídia & Extras
  foto_url          TEXT,                          -- URL pública no Supabase Storage
  obs               TEXT,                          -- observações livres

  -- Controle
  ativo             BOOLEAN     NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. Trigger: updated_at automático ──────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at_catalogo_tapetes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_catalogo_tapetes_lv_updated_at ON public.catalogo_tapetes_lv;
CREATE TRIGGER trg_catalogo_tapetes_lv_updated_at
  BEFORE UPDATE ON public.catalogo_tapetes_lv
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_catalogo_tapetes();

-- ── 3. Índices para performance ────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ctlv_nome      ON public.catalogo_tapetes_lv (nome);
CREATE INDEX IF NOT EXISTS idx_ctlv_colecao   ON public.catalogo_tapetes_lv (colecao);
CREATE INDEX IF NOT EXISTS idx_ctlv_linha     ON public.catalogo_tapetes_lv (linha);
CREATE INDEX IF NOT EXISTS idx_ctlv_codigo    ON public.catalogo_tapetes_lv (codigo);
CREATE INDEX IF NOT EXISTS idx_ctlv_ativo     ON public.catalogo_tapetes_lv (ativo);
CREATE INDEX IF NOT EXISTS idx_ctlv_fornecedor ON public.catalogo_tapetes_lv (fornecedor);

-- ── 4. RLS (Row Level Security) ────────────────────────────
ALTER TABLE public.catalogo_tapetes_lv ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ctlv_select" ON public.catalogo_tapetes_lv;
DROP POLICY IF EXISTS "ctlv_insert" ON public.catalogo_tapetes_lv;
DROP POLICY IF EXISTS "ctlv_update" ON public.catalogo_tapetes_lv;
DROP POLICY IF EXISTS "ctlv_delete" ON public.catalogo_tapetes_lv;

CREATE POLICY "ctlv_select" ON public.catalogo_tapetes_lv
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "ctlv_insert" ON public.catalogo_tapetes_lv
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "ctlv_update" ON public.catalogo_tapetes_lv
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "ctlv_delete" ON public.catalogo_tapetes_lv
  FOR DELETE TO authenticated USING (true);

-- ── 5. Tabela de Movimentações do Catálogo ─────────────────
-- Registra todas as entradas, saídas e ajustes de cada tapete
CREATE TABLE IF NOT EXISTS public.catalogo_tapetes_lv_movs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tapete_id   UUID        NOT NULL REFERENCES public.catalogo_tapetes_lv(id) ON DELETE CASCADE,
  tipo        TEXT        NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste')),
  quantidade  INTEGER     NOT NULL,
  motivo      TEXT,
  nf          TEXT,                          -- número da NF (para entradas)
  usuario     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ctlv_movs_tapete ON public.catalogo_tapetes_lv_movs (tapete_id);
CREATE INDEX IF NOT EXISTS idx_ctlv_movs_tipo   ON public.catalogo_tapetes_lv_movs (tipo);
CREATE INDEX IF NOT EXISTS idx_ctlv_movs_data   ON public.catalogo_tapetes_lv_movs (created_at DESC);

ALTER TABLE public.catalogo_tapetes_lv_movs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ctlv_movs_select" ON public.catalogo_tapetes_lv_movs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "ctlv_movs_insert" ON public.catalogo_tapetes_lv_movs
  FOR INSERT TO authenticated WITH CHECK (true);

-- ── 6. Trigger: atualiza quantidade automaticamente ────────
CREATE OR REPLACE FUNCTION public.atualizar_qtd_tapete_catalogo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tipo = 'entrada' THEN
    UPDATE public.catalogo_tapetes_lv
      SET quantidade = quantidade + NEW.quantidade
      WHERE id = NEW.tapete_id;
  ELSIF NEW.tipo = 'saida' THEN
    UPDATE public.catalogo_tapetes_lv
      SET quantidade = GREATEST(0, quantidade - NEW.quantidade)
      WHERE id = NEW.tapete_id;
  ELSIF NEW.tipo = 'ajuste' THEN
    UPDATE public.catalogo_tapetes_lv
      SET quantidade = NEW.quantidade
      WHERE id = NEW.tapete_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ctlv_movs_qtd ON public.catalogo_tapetes_lv_movs;
CREATE TRIGGER trg_ctlv_movs_qtd
  AFTER INSERT ON public.catalogo_tapetes_lv_movs
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_qtd_tapete_catalogo();

-- ── 7. Storage Bucket (fazer manualmente no Dashboard) ─────
-- Storage → New Bucket
--   Nome:        tapetes-lv
--   Public:      YES
--   Max size:    5242880  (5 MB)
--   MIME types:  image/jpeg, image/png, image/webp
--
-- Após criar o bucket, execute:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tapetes-lv',
  'tapetes-lv',
  true,
  5242880,
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- FIM DA MIGRATION
-- Após executar, verifique em:
--   Table Editor → catalogo_tapetes_lv ✓
--   Storage → tapetes-lv ✓
-- ============================================================
