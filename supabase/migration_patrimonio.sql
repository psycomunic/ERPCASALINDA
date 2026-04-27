-- Criação da tabela de manutenções de patrimônio
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

-- Atributos de segurança e políticas RLS para a nova tabela
alter table patrimonio_manutencoes enable row level security;

create policy "Authenticated full access to patrimonio_manutencoes" 
  on patrimonio_manutencoes
  for all 
  to authenticated 
  using (true) 
  with check (true);
