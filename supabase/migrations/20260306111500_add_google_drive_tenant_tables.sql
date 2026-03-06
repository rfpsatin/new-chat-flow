-- Google Drive por tenant (OAuth por empresa)

create table if not exists public.empresa_google_drive_config (
  empresa_id uuid primary key references public.empresas(id) on delete cascade,
  connected_by_auth_user_id uuid references auth.users(id) on delete set null,
  google_user_email text not null,
  google_drive_root_folder_id text not null,
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  token_expires_at timestamptz not null,
  scopes text[] not null default '{}',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_error text
);

create table if not exists public.empresa_arquivos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  conversa_id uuid references public.conversas(id) on delete set null,
  mensagem_historico_id bigint references public.mensagens_historico(id) on delete set null,
  drive_file_id text not null,
  drive_folder_id text not null,
  nome text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  uploaded_by_user_id uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_empresa_arquivos_empresa_created
  on public.empresa_arquivos (empresa_id, created_at desc);

create unique index if not exists idx_empresa_arquivos_drive_file_unique
  on public.empresa_arquivos (empresa_id, drive_file_id);

alter table public.empresa_google_drive_config enable row level security;
alter table public.empresa_arquivos enable row level security;

create policy "Usuarios podem ver config google drive da propria empresa"
  on public.empresa_google_drive_config
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.usuarios u
      where u.auth_user_id = auth.uid()
        and u.empresa_id = empresa_google_drive_config.empresa_id
        and u.ativo = true
    )
  );

create policy "Usuarios podem ver arquivos da propria empresa"
  on public.empresa_arquivos
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.usuarios u
      where u.auth_user_id = auth.uid()
        and u.empresa_id = empresa_arquivos.empresa_id
        and u.ativo = true
    )
  );
