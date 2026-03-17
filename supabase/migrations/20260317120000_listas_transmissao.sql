-- Tabela de listas de transmissão (segmentos reutilizáveis por empresa)
create table if not exists public.listas_transmissao (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  descricao text,
  provider text not null default 'whapi',
  provider_list_id text,
  status text not null default 'rascunho'
    check (status in ('rascunho', 'sincronizada', 'erro', 'inativa')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.listas_transmissao is 'Listas de transmissão lógicas por empresa (ex: segmentos de contatos para broadcast via WhatsApp).';

create index if not exists idx_listas_transmissao_empresa_status
  on public.listas_transmissao (empresa_id, status);

alter table public.listas_transmissao enable row level security;

-- Apenas usuários autenticados do tenant (ou superadmin) podem ver/gerenciar suas listas
create policy "Listas transmissao all por tenant"
  on public.listas_transmissao
  for all
  to authenticated
  using (
    public.is_super_admin(auth.uid())
    or empresa_id = public.current_empresa_id()
  )
  with check (
    public.is_super_admin(auth.uid())
    or empresa_id = public.current_empresa_id()
  );

