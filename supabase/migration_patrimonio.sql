-- Criação da Tabela Principal de Ativos (Patrimônio)
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
  status          text          not null default 'ativo' check (status in ('ativo', 'manutenção', 'inativo', 'alienado')),
  obs             text,
  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now()
);

create index if not exists idx_patrimonio_status   on patrimonio (status);
create index if not exists idx_patrimonio_categoria on patrimonio (categoria);

alter table patrimonio enable row level security;
drop policy if exists "Authenticated full access to patrimonio" on patrimonio;
create policy "Authenticated full access to patrimonio" on patrimonio
  for all using (auth.role() = 'authenticated');

-- Criação da Tabela de Manutenções
create table if not exists patrimonio_manutencoes (
  id          uuid        primary key default gen_random_uuid(),
  ativo       text        not null,
  tipo        text        not null,
  empresa     text,
  obs         text,
  status      text        not null default 'PENDENTE' check (status in ('CONCLUÍDO', 'PENDENTE')),
  time        text,
  created_at  timestamptz not null default now()
);

alter table patrimonio_manutencoes enable row level security;
drop policy if exists "Authenticated full access to patrimonio_manutencoes" on patrimonio_manutencoes;
create policy "Authenticated full access to patrimonio_manutencoes" 
  on patrimonio_manutencoes
  for all using (auth.role() = 'authenticated');
