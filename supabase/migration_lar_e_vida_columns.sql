-- ─── Migration: Colunas extras para Lar e Vida ────────────────────────────────
-- Execute este script no Supabase SQL Editor (https://app.supabase.com → SQL Editor)
-- Ele adiciona as colunas necessárias para o módulo Lar e Vida sem quebrar a Casa Linda.

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS store_id           TEXT    DEFAULT 'casa-linda',
  ADD COLUMN IF NOT EXISTS sku                TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS foto_url           TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nome_fornecedor    TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS codigo_fornecedor  TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tamanho            TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cor                TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS categoria          TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS quantidade         INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS cliente_email      TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cliente_telefone   TEXT    DEFAULT NULL;

-- Garante que pedidos existentes (Casa Linda) ficam com store_id correto
UPDATE pedidos SET store_id = 'casa-linda' WHERE store_id IS NULL;

-- Índice para filtrar por loja (melhora performance)
CREATE INDEX IF NOT EXISTS idx_pedidos_store_id ON pedidos(store_id);
