ALTER TABLE public.conversas RENAME COLUMN source TO origem;

COMMENT ON COLUMN public.conversas.origem IS 'Origem da mensagem (ex: web-chat, whatsapp)';

DROP VIEW IF EXISTS public.vw_fila_atendimento;

CREATE VIEW public.vw_fila_atendimento AS
SELECT
  c.id AS conversa_id,
  c.empresa_id,
  co.id AS contato_id,
  co.nome AS contato_nome,
  co.whatsapp_numero,
  c.status,
  c.last_message_at,
  c.created_at,
  c.agente_responsavel_id,
  u.nome AS agente_nome,
  c.resumo,
  c.origem,
  c.channel,
  c.nr_protocolo
FROM public.conversas c
JOIN public.contatos co ON co.id = c.contato_id
LEFT JOIN public.usuarios u ON u.id = c.agente_responsavel_id
WHERE c.status = ANY (ARRAY['bot','esperando_tria','fila_humano','em_atendimento_humano'])
ORDER BY c.last_message_at DESC;