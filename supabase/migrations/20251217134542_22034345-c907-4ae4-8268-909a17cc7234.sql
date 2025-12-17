-- Recriar views com SECURITY INVOKER
drop view if exists public.vw_fila_atendimento;
drop view if exists public.vw_historico_conversas;

create view public.vw_fila_atendimento
with (security_invoker = true)
as
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

create view public.vw_historico_conversas
with (security_invoker = true)
as
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