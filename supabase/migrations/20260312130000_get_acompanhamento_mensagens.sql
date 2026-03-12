-- Função RPC para acompanhamento de mensagens por empresa (apenas super admin)
create or replace function public.get_acompanhamento_mensagens(
  p_data_inicio timestamptz,
  p_data_fim timestamptz
)
returns table (
  empresa_id uuid,
  empresa_nome text,
  mensagens_recebidas bigint,
  conversas_fechadas bigint,
  em_aberto_total bigint,
  em_aberto_bot bigint,
  em_aberto_triagem bigint,
  em_aberto_fila bigint,
  em_aberto_atendimento bigint
)
language sql
security definer
set search_path = public
as $$
  select
    e.id as empresa_id,
    coalesce(e.nome_fantasia, e.razao_social) as empresa_nome,
    coalesce(m.mensagens_recebidas, 0) as mensagens_recebidas,
    coalesce(cf.conversas_fechadas, 0) as conversas_fechadas,
    coalesce(ca.em_aberto_total, 0) as em_aberto_total,
    coalesce(ca.em_aberto_bot, 0) as em_aberto_bot,
    coalesce(ca.em_aberto_triagem, 0) as em_aberto_triagem,
    coalesce(ca.em_aberto_fila, 0) as em_aberto_fila,
    coalesce(ca.em_aberto_atendimento, 0) as em_aberto_atendimento
  from public.empresas e
  left join (
    select
      empresa_id,
      count(*)::bigint as mensagens_recebidas
    from public.vw_mensagens_consolidado
    where direcao = 'in'
      and criado_em >= p_data_inicio
      and criado_em <= p_data_fim
    group by empresa_id
  ) m on m.empresa_id = e.id
  left join (
    select
      empresa_id,
      count(*)::bigint as conversas_fechadas
    from public.conversas
    where status = 'encerrado'
      and encerrado_em is not null
      and encerrado_em >= p_data_inicio
      and encerrado_em <= p_data_fim
    group by empresa_id
  ) cf on cf.empresa_id = e.id
  left join (
    select
      empresa_id,
      count(*)::bigint as em_aberto_total,
      count(*) filter (where status = 'bot')::bigint as em_aberto_bot,
      count(*) filter (where status = 'esperando_tria')::bigint as em_aberto_triagem,
      count(*) filter (where status = 'fila_humano')::bigint as em_aberto_fila,
      count(*) filter (where status = 'em_atendimento_humano')::bigint as em_aberto_atendimento
    from public.conversas
    where status <> 'encerrado'
    group by empresa_id
  ) ca on ca.empresa_id = e.id
  where public.is_super_admin(auth.uid());
$$;

