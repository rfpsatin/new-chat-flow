-- Fase 2: hardening de RLS para isolamento multitenant
-- Remove politicas permissivas MVP e aplica escopo por empresa do usuario autenticado.

-- Helpers de contexto do usuario autenticado
create or replace function public.current_empresa_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.empresa_id
  from public.usuarios u
  where u.auth_user_id = auth.uid()
    and u.ativo = true
  limit 1
$$;

create or replace function public.current_tipo_usuario()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.tipo_usuario
  from public.usuarios u
  where u.auth_user_id = auth.uid()
    and u.ativo = true
  limit 1
$$;

grant execute on function public.current_empresa_id() to authenticated;
grant execute on function public.current_tipo_usuario() to authenticated;

-- Remove politicas permissivas antigas
drop policy if exists "Usuarios podem ver empresas" on public.empresas;
drop policy if exists "Usuarios podem ver usuarios" on public.usuarios;
drop policy if exists "Usuarios podem ver contatos" on public.contatos;
drop policy if exists "Usuarios podem ver conversas" on public.conversas;
drop policy if exists "Usuarios podem ver mensagens ativas" on public.mensagens_ativas;
drop policy if exists "Usuarios podem ver mensagens historico" on public.mensagens_historico;
drop policy if exists "Usuarios podem ver motivos" on public.motivos_encerramento;
drop policy if exists "Usuarios podem ver atendentes" on public.atendentes;

-- EMPRESAS
create policy "Empresas select por tenant ou super admin"
  on public.empresas
  for select
  to authenticated
  using (
    public.is_super_admin(auth.uid())
    or id = public.current_empresa_id()
  );

create policy "Empresas update por admin tenant"
  on public.empresas
  for update
  to authenticated
  using (
    public.is_super_admin(auth.uid())
    or (
      id = public.current_empresa_id()
      and public.current_tipo_usuario() = 'adm'
    )
  )
  with check (
    public.is_super_admin(auth.uid())
    or (
      id = public.current_empresa_id()
      and public.current_tipo_usuario() = 'adm'
    )
  );

-- USUARIOS
create policy "Usuarios select por tenant ou super admin"
  on public.usuarios
  for select
  to authenticated
  using (
    public.is_super_admin(auth.uid())
    or empresa_id = public.current_empresa_id()
  );

create policy "Usuarios insert por admin tenant"
  on public.usuarios
  for insert
  to authenticated
  with check (
    public.is_super_admin(auth.uid())
    or (
      empresa_id = public.current_empresa_id()
      and public.current_tipo_usuario() = 'adm'
    )
  );

create policy "Usuarios update por admin tenant ou proprio usuario"
  on public.usuarios
  for update
  to authenticated
  using (
    public.is_super_admin(auth.uid())
    or (
      empresa_id = public.current_empresa_id()
      and (
        public.current_tipo_usuario() = 'adm'
        or auth_user_id = auth.uid()
      )
    )
  )
  with check (
    public.is_super_admin(auth.uid())
    or empresa_id = public.current_empresa_id()
  );

-- CONTATOS
create policy "Contatos all por tenant"
  on public.contatos
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

-- CONVERSAS
create policy "Conversas all por tenant"
  on public.conversas
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

-- MENSAGENS ATIVAS
create policy "Mensagens ativas all por tenant"
  on public.mensagens_ativas
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

-- MENSAGENS HISTORICO
create policy "Mensagens historico all por tenant"
  on public.mensagens_historico
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

-- MOTIVOS DE ENCERRAMENTO
create policy "Motivos all por tenant"
  on public.motivos_encerramento
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

-- ATENDENTES
create policy "Atendentes all por tenant"
  on public.atendentes
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

