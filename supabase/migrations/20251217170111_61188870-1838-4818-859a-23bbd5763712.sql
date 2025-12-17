-- Recriar a view com mais informações para o histórico
DROP VIEW IF EXISTS vw_historico_conversas;

CREATE VIEW vw_historico_conversas AS
SELECT 
  c.id as conversa_id,
  c.empresa_id,
  c.contato_id,
  c.status,
  c.canal,
  c.resumo,
  c.created_at as iniciado_em,
  c.encerrado_em,
  c.agente_responsavel_id,
  me.descricao as motivo_encerramento,
  cont.nome as contato_nome,
  cont.whatsapp_numero,
  u.nome as agente_nome
FROM conversas c
LEFT JOIN motivos_encerramento me ON c.motivo_encerramento_id = me.id
LEFT JOIN contatos cont ON c.contato_id = cont.id
LEFT JOIN usuarios u ON c.agente_responsavel_id = u.id
WHERE c.status = 'encerrado';