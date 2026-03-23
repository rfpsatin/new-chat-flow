-- Criar enum para tipos de papel de usuário
create type public.app_role as enum ('adm', 'sup', 'opr');

-- Tabela de empresas
create table public.empresas (
  id              uuid primary key default gen_random_uuid(),
  razao_social    text not null,
  nome_fantasia   text,
  cnpj            varchar(14) not null unique,
  ativo           boolean not null default true,
  created_at      timestamptz not null default now()
);

-- Tabela de usuários
create table public.usuarios (
  id              uuid primary key default gen_random_uuid(),
  auth_user_id    uuid references auth.users(id) on delete cascade,
  empresa_id      uuid not null references public.empresas(id) on delete restrict,
  nome            text not null,
  email           text not null unique,
  tipo_usuario    text not null check (tipo_usuario in ('adm','sup','opr')),
  ativo           boolean not null default true,
  created_at      timestamptz not null default now()
);

-- Tabela de contatos
create table public.contatos (
  id               uuid primary key default gen_random_uuid(),
  empresa_id       uuid not null references public.empresas(id) on delete cascade,
  nome             text,
  whatsapp_numero  text not null,
  telefone_numero  text,
  created_at       timestamptz not null default now(),
  unique (empresa_id, whatsapp_numero)
);

-- Tabela de motivos de encerramento
create table public.motivos_encerramento (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas(id) on delete cascade,
  descricao   text not null,
  ativo       boolean not null default true
);

-- Tabela de conversas (sessões)
create table public.conversas (
  id                      uuid primary key default gen_random_uuid(),
  empresa_id              uuid not null references public.empresas(id) on delete cascade,
  contato_id              uuid not null references public.contatos(id) on delete cascade,
  canal                   text not null default 'whatsapp',
  status                  text not null check (
                            status in (
                              'bot',
                              'esperando_tria',
                              'fila_humano',
                              'em_atendimento_humano',
                              'encerrado'
                            )
                          ),
  iniciado_por            text not null default 'cliente' check (
                            iniciado_por in ('cliente','agente','sistema')
                          ),
  agente_responsavel_id   uuid references public.usuarios(id),
  motivo_encerramento_id  uuid references public.motivos_encerramento(id),
  encerrado_por_id        uuid references public.usuarios(id),
  encerrado_em            timestamptz,
  resumo                  text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  last_message_at         timestamptz not null default now()
);

create index idx_conversas_empresa_status
  on public.conversas (empresa_id, status, last_message_at desc);

create index idx_conversas_contato
  on public.conversas (contato_id, created_at desc);

-- Tabela de mensagens ativas
create table public.mensagens_ativas (
  id              bigserial primary key,
  empresa_id      uuid not null references public.empresas(id) on delete cascade,
  conversa_id     uuid not null references public.conversas(id) on delete cascade,
  contato_id      uuid not null references public.contatos(id) on delete cascade,
  direcao         text not null check (direcao in ('in','out')),
  tipo_remetente  text not null check (tipo_remetente in ('cliente','bot','agente','sistema')),
  remetente_id    uuid references public.usuarios(id),
  conteudo        text,
  payload         jsonb,
  criado_em       timestamptz not null default now()
);

create index idx_msg_ativas_conversa
  on public.mensagens_ativas (conversa_id, criado_em asc);

create index idx_msg_ativas_empresa
  on public.mensagens_ativas (empresa_id, criado_em desc);

-- Tabela de mensagens histórico
create table public.mensagens_historico (
  id              bigserial primary key,
  empresa_id      uuid not null references public.empresas(id) on delete cascade,
  conversa_id     uuid not null references public.conversas(id) on delete cascade,
  contato_id      uuid not null references public.contatos(id) on delete cascade,
  direcao         text not null check (direcao in ('in','out')),
  tipo_remetente  text not null check (tipo_remetente in ('cliente','bot','agente','sistema')),
  remetente_id    uuid references public.usuarios(id),
  conteudo        text,
  payload         jsonb,
  criado_em       timestamptz not null,
  arquivado_em    timestamptz not null default now()
);

create index idx_msg_hist_conversa
  on public.mensagens_historico (conversa_id, criado_em asc);

create index idx_msg_hist_empresa
  on public.mensagens_historico (empresa_id, criado_em desc);

-- Tabela de atendentes (para triagem)
create table public.atendentes (
  id              uuid primary key default gen_random_uuid(),
  usuario_id      uuid not null references public.usuarios(id) on delete cascade,
  empresa_id      uuid not null references public.empresas(id) on delete cascade,
  para_triagem    boolean not null default false,
  nome            text not null,
  ativo           boolean not null default true,
  created_at      timestamptz not null default now()
);

-- View de fila de atendimento
create or replace view public.vw_fila_atendimento as
select
  c.id                          as conversa_id,
  c.empresa_id,
  co.id                         as contato_id,
  co.nome                       as contato_nome,
  co.whatsapp_numero,
  c.status,
  c.last_message_at,
  c.created_at,
  c.agente_responsavel_id,
  u.nome                        as agente_nome,
  c.resumo
from public.conversas c
join public.contatos co on co.id = c.contato_id
left join public.usuarios u on u.id = c.agente_responsavel_id
where c.status in ('esperando_tria', 'fila_humano', 'em_atendimento_humano')
order by c.last_message_at desc;

-- View de histórico de conversas
create or replace view public.vw_historico_conversas as
select
  c.id                 as conversa_id,
  c.contato_id,
  c.empresa_id,
  c.canal,
  c.status,
  c.created_at         as iniciado_em,
  c.encerrado_em,
  me.descricao         as motivo_encerramento,
  c.resumo
from public.conversas c
left join public.motivos_encerramento me
       on me.id = c.motivo_encerramento_id
where c.status = 'encerrado'
order by c.created_at desc;

-- Função para encerrar conversa
create or replace function public.encerrar_conversa(
  p_conversa_id         uuid,
  p_motivo_id           uuid,
  p_usuario_id          uuid,
  p_resumo              text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversas
  set status                 = 'encerrado',
      motivo_encerramento_id = p_motivo_id,
      encerrado_por_id       = p_usuario_id,
      encerrado_em           = now(),
      resumo                 = coalesce(p_resumo, resumo),
      updated_at             = now()
  where id = p_conversa_id;

  insert into public.mensagens_historico (
    empresa_id,
    conversa_id,
    contato_id,
    direcao,
    tipo_remetente,
    remetente_id,
    conteudo,
    payload,
    criado_em
  )
  select
    empresa_id,
    conversa_id,
    contato_id,
    direcao,
    tipo_remetente,
    remetente_id,
    conteudo,
    payload,
    criado_em
  from public.mensagens_ativas
  where conversa_id = p_conversa_id;

  delete from public.mensagens_ativas
  where conversa_id = p_conversa_id;
end;
$$;

-- Função para atribuir agente
create or replace function public.atribuir_agente(
  p_conversa_id   uuid,
  p_agente_id     uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversas
  set status                = 'em_atendimento_humano',
      agente_responsavel_id = p_agente_id,
      updated_at            = now()
  where id = p_conversa_id
    and status in ('esperando_tria','fila_humano');
end;
$$;

-- Enable RLS
alter table public.empresas enable row level security;
alter table public.usuarios enable row level security;
alter table public.contatos enable row level security;
alter table public.conversas enable row level security;
alter table public.mensagens_ativas enable row level security;
alter table public.mensagens_historico enable row level security;
alter table public.motivos_encerramento enable row level security;
alter table public.atendentes enable row level security;

-- Políticas de segurança (permissivas para o MVP - usuários autenticados podem ver dados da sua empresa)
create policy "Usuarios podem ver empresas" on public.empresas for select using (true);
create policy "Usuarios podem ver usuarios" on public.usuarios for select using (true);
create policy "Usuarios podem ver contatos" on public.contatos for all using (true);
create policy "Usuarios podem ver conversas" on public.conversas for all using (true);
create policy "Usuarios podem ver mensagens ativas" on public.mensagens_ativas for all using (true);
create policy "Usuarios podem ver mensagens historico" on public.mensagens_historico for all using (true);
create policy "Usuarios podem ver motivos" on public.motivos_encerramento for all using (true);
create policy "Usuarios podem ver atendentes" on public.atendentes for all using (true);

-- Habilitar realtime para mensagens e conversas
ALTER PUBLICATION supabase_realtime ADD TABLE public.mensagens_ativas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversas;