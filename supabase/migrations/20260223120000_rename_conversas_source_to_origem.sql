-- Renomear coluna source para origem na tabela conversas (webhook n8n whatsapp_cinemkt)
ALTER TABLE public.conversas
  RENAME COLUMN source TO origem;

COMMENT ON COLUMN public.conversas.origem IS 'Origem da mensagem (ex: web-chat, whatsapp). Específico do webhook n8n whatsapp_cinemkt.';

-- Recrear view vw_fila_atendimento para usar c.origem
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
WHERE c.status = ANY (ARRAY['bot'::text, 'esperando_tria'::text, 'fila_humano'::text, 'em_atendimento_humano'::text])
ORDER BY c.last_message_at DESC;
