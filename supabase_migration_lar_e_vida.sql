-- ============================================================
-- Migration: Adicionar store_id à tabela pedidos
-- Suporte multi-loja: Casa Linda e Lar e Vida
-- ============================================================
-- Execute este script no editor SQL do Supabase:
-- Dashboard → SQL Editor → New Query → Cole e execute

-- 1. Adicionar coluna store_id (padrão = 'casa-linda' para pedidos existentes)
ALTER TABLE pedidos
ADD COLUMN IF NOT EXISTS store_id TEXT NOT NULL DEFAULT 'casa-linda';

-- 2. Atualizar pedidos existentes para garantir que todos tenham store_id
UPDATE pedidos
SET store_id = 'casa-linda'
WHERE store_id IS NULL OR store_id = '';

-- 3. Índice para performance em queries filtradas por loja
CREATE INDEX IF NOT EXISTS idx_pedidos_store_id ON pedidos (store_id);

-- 4. Índice composto para queries de produção por loja
CREATE INDEX IF NOT EXISTS idx_pedidos_store_etapa ON pedidos (store_id, etapa);

-- Verificar resultado:
-- SELECT store_id, count(*) FROM pedidos GROUP BY store_id;
