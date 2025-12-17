-- Drop and recreate view to include 'bot' status
DROP VIEW IF EXISTS vw_fila_atendimento;

CREATE VIEW vw_fila_atendimento AS
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
    c.resumo
FROM conversas c
JOIN contatos co ON co.id = c.contato_id
LEFT JOIN usuarios u ON u.id = c.agente_responsavel_id
WHERE c.status = ANY (ARRAY['bot'::text, 'esperando_tria'::text, 'fila_humano'::text, 'em_atendimento_humano'::text])
ORDER BY c.last_message_at DESC;