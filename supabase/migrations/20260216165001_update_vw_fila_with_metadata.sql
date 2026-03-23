-- Atualizar view vw_fila_atendimento para incluir campos source e channel
-- Isso permite que o frontend exiba etiquetas nas conversas

CREATE OR REPLACE VIEW public.vw_fila_atendimento AS
SELECT
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
  c.resumo,
  c.source,
  c.channel
FROM public.conversas c
JOIN public.contatos co on co.id = c.contato_id
LEFT JOIN public.usuarios u on u.id = c.agente_responsavel_id
WHERE c.status in ('esperando_tria', 'fila_humano', 'em_atendimento_humano')
ORDER BY c.last_message_at desc;

