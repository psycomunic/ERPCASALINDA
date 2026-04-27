-- Adiciona campo codigo_fornecedor à tabela de insumos
ALTER TABLE estoque_itens
  ADD COLUMN IF NOT EXISTS codigo_fornecedor text;
