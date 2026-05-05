-- ─── Migration: Fluxo Compra para Estoque de Tapetes ──────────────────────────
-- Execute no Supabase SQL Editor: https://app.supabase.com → SQL Editor
-- Adiciona colunas para o fluxo de pedidos de tapete para reposição de estoque.

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS confirmacao_fornecedor_url  TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS localizacao_prateleira      TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS data_entrada_estoque        TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS disponivel_site             BOOLEAN     DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS data_publicacao_site        TIMESTAMPTZ DEFAULT NULL;

-- Índice para consultas por tipo de pedido (melhora performance)
CREATE INDEX IF NOT EXISTS idx_pedidos_tipo ON pedidos(tipo_pedido);
CREATE INDEX IF NOT EXISTS idx_pedidos_disponivel_site ON pedidos(disponivel_site);

-- Comentários para documentação
COMMENT ON COLUMN pedidos.confirmacao_fornecedor_url IS 'URL do arquivo de confirmação de pedido enviado pelo fornecedor (PDF/imagem)';
COMMENT ON COLUMN pedidos.localizacao_prateleira IS 'Localização física no estoque da Lar e Vida, ex: A-03, Prateleira 2';
COMMENT ON COLUMN pedidos.data_entrada_estoque IS 'Data em que o produto entrou fisicamente no estoque';
COMMENT ON COLUMN pedidos.disponivel_site IS 'Se o tapete já foi cadastrado e publicado no site para venda';
COMMENT ON COLUMN pedidos.data_publicacao_site IS 'Data em que o produto foi publicado no site';
