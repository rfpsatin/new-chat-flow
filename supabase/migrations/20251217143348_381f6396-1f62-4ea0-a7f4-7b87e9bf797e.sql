-- 1. Atualizar vw_fila_atendimento para incluir em_atendimento_humano
DROP VIEW IF EXISTS public.vw_fila_atendimento;

CREATE OR REPLACE VIEW public.vw_fila_atendimento WITH (security_invoker = true) AS
SELECT
  c.id as conversa_id,
  c.empresa_id,
  co.id as contato_id,
  co.nome as contato_nome,
  co.whatsapp_numero,
  c.status,
  c.last_message_at,
  c.created_at,
  c.agente_responsavel_id,
  u.nome as agente_nome,
  c.resumo
FROM public.conversas c
JOIN public.contatos co ON co.id = c.contato_id
LEFT JOIN public.usuarios u ON u.id = c.agente_responsavel_id
WHERE c.status IN ('esperando_tria', 'fila_humano', 'em_atendimento_humano')
ORDER BY c.last_message_at DESC;