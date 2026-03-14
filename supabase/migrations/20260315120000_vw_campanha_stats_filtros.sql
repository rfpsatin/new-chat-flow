-- Incluir tags, modo_resposta e created_at na view para permitir filtros na listagem
ALTER TABLE public.campanhas
  ADD COLUMN IF NOT EXISTS modo_resposta text;

CREATE OR REPLACE VIEW public.vw_campanha_stats AS
SELECT
  c.id AS campanha_id,
  c.empresa_id,
  c.nome,
  c.status,
  c.tags,
  c.modo_resposta,
  c.created_at,
  c.agendado_para,
  c.iniciada_em,
  c.finalizada_em,
  COUNT(d.id)::int AS total_destinatarios,
  COUNT(d.id) FILTER (WHERE d.status_envio = 'pendente')::int AS pendentes,
  COUNT(d.id) FILTER (WHERE d.status_envio = 'enviado')::int AS enviados,
  COUNT(d.id) FILTER (WHERE d.status_envio = 'erro_envio')::int AS erros,
  COUNT(d.id) FILTER (WHERE d.status_envio = 'entregue')::int AS entregues,
  COUNT(d.id) FILTER (WHERE d.conversa_id IS NOT NULL)::int AS conversas_abertas
FROM public.campanhas c
LEFT JOIN public.campanha_destinatarios d ON d.campanha_id = c.id
GROUP BY c.id;
