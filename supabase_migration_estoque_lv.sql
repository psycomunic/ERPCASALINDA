-- ─── Migration: Estoque Lar e Vida ────────────────────────────────────────────
-- Execute no painel Supabase → SQL Editor antes de usar o módulo de tapetes.
--
-- Esta migration não é obrigatória para o funcionamento básico.
-- Os itens LV são identificados por:
--   Tapetes:         categoria = 'Tapete' AND fornecedor = 'Tellaio'
--   Outros produtos: fornecedor = 'Lar e Vida'
--
-- Opcional: adicionar coluna store_id para separação explícita de lojas.

ALTER TABLE estoque_itens
  ADD COLUMN IF NOT EXISTS store_id text DEFAULT 'casa-linda';

COMMENT ON COLUMN estoque_itens.store_id IS
  'Identifica a loja: "casa-linda" | "lar-e-vida"';

-- Atualizar itens existentes que já sejam de tapetes Tellaio
UPDATE estoque_itens
  SET store_id = 'lar-e-vida'
  WHERE categoria = 'Tapete' AND fornecedor = 'Tellaio';

-- Atualizar outros produtos LV existentes
UPDATE estoque_itens
  SET store_id = 'lar-e-vida'
  WHERE fornecedor = 'Lar e Vida';

-- Índice para queries eficientes por loja
CREATE INDEX IF NOT EXISTS idx_estoque_itens_store_id
  ON estoque_itens (store_id);

CREATE INDEX IF NOT EXISTS idx_estoque_itens_categoria
  ON estoque_itens (categoria);
