-- Add volumes column for tracking package count in expedition
ALTER TABLE pedidos 
ADD COLUMN IF NOT EXISTS volumes integer default 1;
