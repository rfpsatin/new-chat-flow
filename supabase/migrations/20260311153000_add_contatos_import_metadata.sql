-- Add metadata fields to identify contact origin and import source tag
alter table public.contatos
  add column if not exists tp_contato text,
  add column if not exists tag_origem text;

update public.contatos
set tp_contato = 'N'
where tp_contato is null;

alter table public.contatos
  alter column tp_contato set default 'N',
  alter column tp_contato set not null;

alter table public.contatos
  drop constraint if exists contatos_tp_contato_check;

alter table public.contatos
  add constraint contatos_tp_contato_check
  check (tp_contato in ('I', 'N'));

create index if not exists idx_contatos_empresa_tag_origem
  on public.contatos (empresa_id, tag_origem);
