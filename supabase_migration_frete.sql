-- Migration: Adicionar coluna frete à tabela pedidos
-- Execute no Supabase SQL Editor: https://app.supabase.com/project/_/sql

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS frete NUMERIC(10,2) DEFAULT NULL;

-- Comentário da coluna
COMMENT ON COLUMN pedidos.frete IS 'Valor do frete do pedido (R$).';
