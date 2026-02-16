

## Plano: Atualizar view vw_fila_atendimento para incluir source e channel

### Problema
A view `vw_fila_atendimento` nao inclui os campos `source` e `channel` da tabela `conversas`. O frontend ja tenta exibir essas etiquetas via `ConversaTags`, mas recebe `undefined` porque a view nao retorna esses dados.

Todo o restante do plano original esta implementado corretamente:
- Colunas no banco de dados
- Edge functions (n8n-webhook-cinemkt e n8n-reset-human-mode)
- Frontend (ConversaTags, ConversaItem, ChatPanel)
- Tipos TypeScript
- Logica de encerramento condicional
- Configuracao do config.toml

### Solucao

**Unica alteracao necessaria:** Recriar a view `vw_fila_atendimento` adicionando `c.source` e `c.channel`.

```sql
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
```

Apos essa migracao, as etiquetas de source/channel passarao a aparecer automaticamente no painel.

