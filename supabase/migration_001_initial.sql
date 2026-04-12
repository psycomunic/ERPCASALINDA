-- ============================================================
-- ERP Casa Linda — Migração Completa do Banco de Dados
-- Projeto: https://tyjdetvuzqpjzhdmdzxo.supabase.co
-- Execute este script no Supabase → SQL Editor → New Query
-- ============================================================

-- ─── Extensões ───────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Função para atualizar updated_at automaticamente ────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- 1. PEDIDOS (Produção / Kanban)
-- ============================================================
create table if not exists pedidos (
  id                uuid        primary key default gen_random_uuid(),
  numero            text        unique not null,
  magazord_id       integer,
  cliente           text        not null,
  produto           text        not null,
  material          text,
  moldura           text,
  acabamento        text,
  canal             text,                          -- 'Site', 'Mercado Livre', 'Shopee', etc.
  etapa             text        not null default 'Impressão',
  status            text        not null default 'Pendente'
                                check (status in ('Pendente', 'Atrasado', 'OK')),
  prazo_entrega     date,
  valor             numeric(10,2),
  obs               text,
  -- Campos de expedição
  endereco          text,
  transportadora    text,
  rastreio          text,
  data_despacho     timestamptz,
  -- Campos de produção
  data_prevista     date,
  hora_prevista     time,
  from_magazord     boolean     not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_pedidos_etapa       on pedidos (etapa);
create index if not exists idx_pedidos_status      on pedidos (status);
create index if not exists idx_pedidos_magazord_id on pedidos (magazord_id);
create index if not exists idx_pedidos_created_at  on pedidos (created_at desc);

create trigger pedidos_updated_at before update on pedidos
  for each row execute function update_updated_at();

-- ============================================================
-- 2. FINANCEIRO — Lançamentos
-- ============================================================
create table if not exists financeiro_lancamentos (
  id                uuid        primary key default gen_random_uuid(),
  tipo              text        not null check (tipo in ('receita', 'despesa')),
  categoria         text,
  descricao         text        not null,
  valor             numeric(10,2) not null check (valor > 0),
  data              date        not null,
  forma_pagamento   text,
  status            text        not null default 'pendente'
                                check (status in ('pendente', 'pago', 'cancelado')),
  pedido_id         uuid        references pedidos(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_fin_tipo   on financeiro_lancamentos (tipo);
create index if not exists idx_fin_data   on financeiro_lancamentos (data desc);
create index if not exists idx_fin_status on financeiro_lancamentos (status);

create trigger fin_lancamentos_updated_at before update on financeiro_lancamentos
  for each row execute function update_updated_at();

-- ============================================================
-- 3. ESTOQUE — Itens
-- ============================================================
create table if not exists estoque_itens (
  id                uuid          primary key default gen_random_uuid(),
  codigo            text          unique,
  nome              text          not null,
  categoria         text,
  unidade           text          not null default 'un',
  quantidade        numeric(10,3) not null default 0 check (quantidade >= 0),
  quantidade_minima numeric(10,3) not null default 0,
  localizacao       text,
  preco_unitario    numeric(10,2),
  fornecedor        text,
  created_at        timestamptz   not null default now(),
  updated_at        timestamptz   not null default now()
);

create index if not exists idx_estoque_categoria on estoque_itens (categoria);
create index if not exists idx_estoque_abaixo_min on estoque_itens (quantidade)
  where quantidade <= quantidade_minima;

create trigger estoque_itens_updated_at before update on estoque_itens
  for each row execute function update_updated_at();

-- ============================================================
-- 4. ESTOQUE — Movimentações
-- ============================================================
create table if not exists estoque_movimentacoes (
  id          uuid          primary key default gen_random_uuid(),
  item_id     uuid          not null references estoque_itens(id) on delete cascade,
  tipo        text          not null check (tipo in ('entrada', 'saida', 'ajuste')),
  quantidade  numeric(10,3) not null,
  motivo      text,
  pedido_id   uuid          references pedidos(id) on delete set null,
  usuario     text,
  created_at  timestamptz   not null default now()
);

create index if not exists idx_mov_item_id   on estoque_movimentacoes (item_id);
create index if not exists idx_mov_created_at on estoque_movimentacoes (created_at desc);

-- Trigger: atualiza a quantidade do item ao registrar movimentação
create or replace function atualiza_estoque_quantidade()
returns trigger as $$
begin
  if new.tipo = 'entrada' then
    update estoque_itens set quantidade = quantidade + new.quantidade where id = new.item_id;
  elsif new.tipo = 'saida' then
    update estoque_itens set quantidade = quantidade - new.quantidade where id = new.item_id;
  elsif new.tipo = 'ajuste' then
    update estoque_itens set quantidade = new.quantidade where id = new.item_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger estoque_movimentacoes_after_insert after insert on estoque_movimentacoes
  for each row execute function atualiza_estoque_quantidade();

-- ============================================================
-- 5. PATRIMÔNIO
-- ============================================================
create table if not exists patrimonio (
  id              uuid          primary key default gen_random_uuid(),
  nome            text          not null,
  categoria       text,
  marca           text,
  modelo          text,
  numero_serie    text,
  data_aquisicao  date,
  valor_aquisicao numeric(10,2),
  valor_atual     numeric(10,2),
  localizacao     text,
  status          text          not null default 'ativo'
                                check (status in ('ativo', 'manutenção', 'inativo', 'alienado')),
  obs             text,
  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now()
);

create index if not exists idx_patrimonio_status   on patrimonio (status);
create index if not exists idx_patrimonio_categoria on patrimonio (categoria);

create trigger patrimonio_updated_at before update on patrimonio
  for each row execute function update_updated_at();

-- ============================================================
-- 6. PARCEIROS (Clientes / Fornecedores)
-- ============================================================
create table if not exists parceiros (
  id        uuid        primary key default gen_random_uuid(),
  tipo      text        not null check (tipo in ('cliente', 'fornecedor', 'ambos')),
  nome      text        not null,
  cnpj_cpf  text,
  email     text,
  telefone  text,
  endereco  text,
  cidade    text,
  uf        char(2),
  cep       text,
  status    text        not null default 'ativo'
                        check (status in ('ativo', 'inativo')),
  obs       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_parceiros_tipo   on parceiros (tipo);
create index if not exists idx_parceiros_status on parceiros (status);
create index if not exists idx_parceiros_nome   on parceiros (nome);

create trigger parceiros_updated_at before update on parceiros
  for each row execute function update_updated_at();

-- ============================================================
-- 7. CONFIGURAÇÕES (Chave-Valor)
-- ============================================================
create table if not exists configuracoes (
  id         uuid        primary key default gen_random_uuid(),
  chave      text        unique not null,
  valor      jsonb       not null,
  descricao  text,
  updated_at timestamptz not null default now()
);

create trigger configuracoes_updated_at before update on configuracoes
  for each row execute function update_updated_at();

-- ─── Configurações padrão ────────────────────────────────────────────────────
insert into configuracoes (chave, valor, descricao) values
  ('empresa_nome',       '"Casa Linda Decorações"',    'Nome da empresa'),
  ('empresa_cnpj',       '"00.000.000/0001-00"',       'CNPJ da empresa'),
  ('empresa_telefone',   '"(00) 0000-0000"',           'Telefone principal'),
  ('empresa_email',      '"contato@casalinda.com.br"', 'E-mail de contato'),
  ('empresa_endereco',   '""',                         'Endereço da empresa'),
  ('magazord_base_url',  '""',                         'URL base da API Magazord'),
  ('estoque_alerta_min', 'true',                       'Alertar quando estoque abaixo do mínimo')
on conflict (chave) do nothing;

-- ============================================================
-- 8. ROW LEVEL SECURITY (RLS) — Segurança básica
-- ============================================================
-- Habilita RLS em todas as tabelas
alter table pedidos                  enable row level security;
alter table financeiro_lancamentos   enable row level security;
alter table estoque_itens            enable row level security;
alter table estoque_movimentacoes    enable row level security;
alter table patrimonio               enable row level security;
alter table parceiros                enable row level security;
alter table configuracoes            enable row level security;

-- Políticas: usuários autenticados têm acesso total (ajuste conforme RBAC futuro)
create policy "Authenticated full access" on pedidos
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on financeiro_lancamentos
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on estoque_itens
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on estoque_movimentacoes
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on patrimonio
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on parceiros
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on configuracoes
  for all using (auth.role() = 'authenticated');

-- ============================================================
-- 9. DADOS INICIAIS DE EXEMPLO (pode remover em produção)
-- ============================================================

-- Itens de estoque iniciais
insert into estoque_itens (codigo, nome, categoria, unidade, quantidade, quantidade_minima, preco_unitario, localizacao) values
  ('PAP-MAT-A3',  'Papel Matte Premium A3',   'Papel',      'resmas',  12,  5,  45.00,  'Prateleira A1'),
  ('PAP-MAT-A2',  'Papel Matte Premium A2',   'Papel',      'resmas',   8,  5,  89.00,  'Prateleira A2'),
  ('CANVAS-LONA', 'Canvas Lona 100cm',         'Tela',       'metros',  45, 20,  28.00,  'Rolo 01'),
  ('VIDS-4MM',    'Vidro 4mm Cristal',         'Vidro',      'm²',      30, 10,  85.00,  'Sala Vidros'),
  ('MOLD-PRETA',  'Perfil Moldura Preta 20mm', 'Moldura',    'metros', 120, 30,  12.50,  'Mold B1'),
  ('MOLD-NATURAL','Perfil Moldura Natural',    'Moldura',    'metros',  95, 30,  14.00,  'Mold B2'),
  ('COLA-HOT',    'Cola Hot Melt Bastão',      'Acessórios', 'kg',       8,  3,  35.00,  'Acess C1'),
  ('ESPUMA-5MM',  'Espuma Fina 5mm',           'Embalagem',  'metros',  60, 20,  8.50,   'Emb D1'),
  ('PAPEL-KRAFT', 'Papel Kraft 80g',           'Embalagem',  'metros', 200, 50,  3.50,   'Emb D2'),
  ('FITA-EMBUL',  'Fita Embalar Transparente', 'Embalagem',  'unid',    48, 12,  6.00,   'Emb D3')
on conflict (codigo) do nothing;

-- ============================================================
-- FIM DA MIGRAÇÃO
-- ============================================================
-- Para gerar os tipos TypeScript automaticamente, execute:
-- npx supabase gen types typescript --project-id tyjdetvuzqpjzhdmdzxo > src/lib/database.types.ts
-- ============================================================
