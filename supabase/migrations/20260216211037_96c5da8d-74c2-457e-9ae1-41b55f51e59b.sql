CREATE OR REPLACE VIEW vw_fila_atendimento AS
SELECT c.id AS conversa_id,
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
    c.source,
    c.channel
FROM conversas c
JOIN contatos co ON co.id = c.contato_id
LEFT JOIN usuarios u ON u.id = c.agente_responsavel_id
WHERE c.status = ANY (ARRAY['bot', 'esperando_tria', 'fila_humano', 'em_atendimento_humano'])
ORDER BY c.last_message_at DESC;