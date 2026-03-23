-- Track Whapi connection status changes for auditing
create table if not exists public.whapi_connection_events (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  source text not null,
  event_type text,
  state text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists whapi_connection_events_empresa_id_created_at_idx
  on public.whapi_connection_events (empresa_id, created_at desc);
