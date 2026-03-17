-- Relação entre listas de transmissão e contatos da empresa
create table if not exists public.lista_transmissao_contatos (
  id uuid primary key default gen_random_uuid(),
  lista_id uuid not null references public.listas_transmissao(id) on delete cascade,
  contato_id uuid not null references public.contatos(id) on delete cascade,
  whatsapp_numero text not null,
  created_at timestamptz not null default now(),
  unique (lista_id, contato_id)
);

comment on table public.lista_transmissao_contatos is 'Contatos vinculados a cada lista de transmissão lógica.';

create index if not exists idx_lista_transmissao_contatos_lista
  on public.lista_transmissao_contatos (lista_id);

alter table public.lista_transmissao_contatos enable row level security;

create policy "Lista transmissao contatos tenant"
  on public.lista_transmissao_contatos
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.listas_transmissao lt
      where lt.id = lista_id
        and (
          public.is_super_admin(auth.uid())
          or lt.empresa_id = public.current_empresa_id()
        )
    )
  )
  with check (
    exists (
      select 1
      from public.listas_transmissao lt
      where lt.id = lista_id
        and (
          public.is_super_admin(auth.uid())
          or lt.empresa_id = public.current_empresa_id()
        )
    )
  );

