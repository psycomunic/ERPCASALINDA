-- Rode este script na aba "SQL Editor" do seu painel do Supabase para inserir todos os itens no banco de dados.
-- O erro 42P01 indica que as tabelas de estoque na verdade nunca tinham sido criadas em sua base atual! Adicionei a estrutura abaixo para criá-las.

-- ============================================================
-- 1. CRIAR AS TABELAS DE ESTOQUE
-- ============================================================

CREATE TABLE IF NOT EXISTS estoque_itens (
  id                uuid          primary key default gen_random_uuid(),
  codigo            text          unique,
  nome              text          not null,
  categoria         text,
  subcategoria      text,
  unidade           text          not null default 'un',
  quantidade        numeric(10,3) not null default 0 check (quantidade >= 0),
  quantidade_minima numeric(10,3) not null default 0,
  localizacao       text,
  preco_unitario    numeric(10,2),
  fornecedor        text,
  created_at        timestamptz   not null default now(),
  updated_at        timestamptz   not null default now()
);

-- Habilita RLS (Row Level Security) e permite acesso
ALTER TABLE estoque_itens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Authenticated full access" ON estoque_itens FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Anon full access" ON estoque_itens FOR ALL USING (auth.role() = 'anon');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


CREATE TABLE IF NOT EXISTS estoque_movimentacoes (
  id          uuid          primary key default gen_random_uuid(),
  item_id     uuid          not null references estoque_itens(id) on delete cascade,
  tipo        text          not null check (tipo in ('entrada', 'saida', 'ajuste')),
  quantidade  numeric(10,3) not null,
  motivo      text,
  pedido_id   uuid          references pedidos(id) on delete set null,
  usuario     text,
  created_at  timestamptz   not null default now()
);

-- Trigger: atualiza a quantidade do item ao registrar movimentação
CREATE OR REPLACE FUNCTION atualiza_estoque_quantidade()
RETURNS trigger AS $body$
BEGIN
  IF NEW.tipo = 'entrada' THEN
    UPDATE estoque_itens SET quantidade = quantidade + NEW.quantidade WHERE id = NEW.item_id;
  ELSIF NEW.tipo = 'saida' THEN
    UPDATE estoque_itens SET quantidade = quantidade - NEW.quantidade WHERE id = NEW.item_id;
  ELSIF NEW.tipo = 'ajuste' THEN
    UPDATE estoque_itens SET quantidade = NEW.quantidade WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$body$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS estoque_movimentacoes_after_insert ON estoque_movimentacoes;
CREATE TRIGGER estoque_movimentacoes_after_insert AFTER INSERT ON estoque_movimentacoes
  FOR EACH ROW EXECUTE FUNCTION atualiza_estoque_quantidade();

ALTER TABLE estoque_movimentacoes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Authenticated full access" ON estoque_movimentacoes FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Anon full access" ON estoque_movimentacoes FOR ALL USING (auth.role() = 'anon');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Recarrega o cache do PostgREST imediatamente (evita bugs de cache na API)
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- 2. POPULAR COM AS MOLDURAS ZERADAS
-- ============================================================

INSERT INTO "public"."estoque_itens" ("codigo", "nome", "categoria", "subcategoria", "quantidade", "quantidade_minima", "unidade", "localizacao")
VALUES
('MLD-100', 'Moldura Sem Moldura (Borda Infinita)', 'Moldura', 'Madeira/Inox', 0, 50, 'm', 'Prateleira 1'),
('MLD-101', 'Moldura Caixa Preta', 'Moldura', 'Madeira/Inox', 0, 50, 'm', 'Prateleira 1'),
('MLD-102', 'Moldura Caixa Branca', 'Moldura', 'Madeira/Inox', 0, 50, 'm', 'Prateleira 1'),
('MLD-103', 'Moldura Caixa Dourada', 'Moldura', 'Madeira/Inox', 0, 50, 'm', 'Prateleira 1'),
('MLD-104', 'Moldura Caixa Madeira', 'Moldura', 'Madeira/Inox', 0, 50, 'm', 'Prateleira 1'),
('MLD-105', 'Moldura Flutuante Preta', 'Moldura', 'Madeira/Inox', 0, 50, 'm', 'Prateleira 1'),
('MLD-106', 'Moldura Flutuante Branca', 'Moldura', 'Madeira/Inox', 0, 50, 'm', 'Prateleira 1'),
('MLD-107', 'Moldura Flutuante Dourada', 'Moldura', 'Madeira/Inox', 0, 50, 'm', 'Prateleira 1'),
('MLD-108', 'Moldura Flutuante Madeira', 'Moldura', 'Madeira/Inox', 0, 50, 'm', 'Prateleira 1'),
('MLD-109', 'Moldura Côncava Preta', 'Moldura', 'Madeira/Inox', 0, 50, 'm', 'Prateleira 1'),
('MLD-110', 'Moldura Côncava Branca', 'Moldura', 'Madeira/Inox', 0, 50, 'm', 'Prateleira 1'),
('MLD-111', 'Moldura Côncava Dourada', 'Moldura', 'Madeira/Inox', 0, 50, 'm', 'Prateleira 1'),
('MLD-112', 'Moldura Côncava Madeira', 'Moldura', 'Madeira/Inox', 0, 50, 'm', 'Prateleira 1'),
('MLD-113', 'Moldura Inox', 'Moldura', 'Madeira/Inox', 0, 50, 'm', 'Prateleira 1'),
('MLD-114', 'Moldura Trono de Ouro', 'Moldura', 'Madeira/Inox', 0, 50, 'm', 'Prateleira 1'),
('MLD-115', 'Moldura Majestade Negra', 'Moldura', 'Madeira/Inox', 0, 50, 'm', 'Prateleira 1'),
('MLD-116', 'Moldura Galeria Imperial', 'Moldura', 'Madeira/Inox', 0, 50, 'm', 'Prateleira 1'),
('MLD-117', 'Moldura Roma Moderna', 'Moldura', 'Madeira/Inox', 0, 50, 'm', 'Prateleira 1'),
('MLD-118', 'Moldura Palaciana', 'Moldura', 'Madeira/Inox', 0, 50, 'm', 'Prateleira 1'),
('MLD-119', 'Moldura Realce Imperial', 'Moldura', 'Madeira/Inox', 0, 50, 'm', 'Prateleira 1'),
('MLD-120', 'Moldura Imperial Prata e Ouro', 'Moldura', 'Madeira/Inox', 0, 50, 'm', 'Prateleira 1'),
('MLD-121', 'Moldura Barroco Imperial', 'Moldura', 'Madeira/Inox', 0, 50, 'm', 'Prateleira 1'),

('VID-200', 'Vidro 85x85', 'Vidro', '2mm Antirreflexo', 0, 10, 'un', 'Prateleira 2'),
('VID-201', 'Vidro 115x115', 'Vidro', '2mm Antirreflexo', 0, 10, 'un', 'Prateleira 2'),
('VID-202', 'Vidro 145x145', 'Vidro', '2mm Antirreflexo', 0, 10, 'un', 'Prateleira 2'),
('VID-203', 'Vidro 85x55', 'Vidro', '2mm Antirreflexo', 0, 10, 'un', 'Prateleira 2'),
('VID-204', 'Vidro 115x75', 'Vidro', '2mm Antirreflexo', 0, 10, 'un', 'Prateleira 2'),
('VID-205', 'Vidro 145x95', 'Vidro', '2mm Antirreflexo', 0, 10, 'un', 'Prateleira 2'),
('VID-206', 'Vidro 175x100', 'Vidro', '2mm Antirreflexo', 0, 10, 'un', 'Prateleira 2'),
('VID-207', 'Vidro 55x35', 'Vidro', '2mm Antirreflexo', 0, 10, 'un', 'Prateleira 2'),
('VID-208', 'Vidro 175x95', 'Vidro', '2mm Antirreflexo', 0, 10, 'un', 'Prateleira 2'),
('VID-209', 'Vidro 40x20', 'Vidro', '2mm Antirreflexo', 0, 10, 'un', 'Prateleira 2'),
('VID-210', 'Vidro 55x30', 'Vidro', '2mm Antirreflexo', 0, 10, 'un', 'Prateleira 2'),
('VID-211', 'Vidro 70x40', 'Vidro', '2mm Antirreflexo', 0, 10, 'un', 'Prateleira 2'),
('VID-212', 'Vidro 90x50', 'Vidro', '2mm Antirreflexo', 0, 10, 'un', 'Prateleira 2'),
('VID-213', 'Vidro 120x70', 'Vidro', '2mm Antirreflexo', 0, 10, 'un', 'Prateleira 2')
ON CONFLICT DO NOTHING;
