

## Plano: Ajustar payload do webchat-human-reply para formato padrao webchat

### Problema

A Edge Function `webchat-human-reply` envia o payload ao n8n com shape `{action, to, mensagem, ...}`, mas o n8n espera o mesmo formato das mensagens normais do webchat: `{to, body, source, channel, channel_id, ...}`.

### Alteracao unica: `supabase/functions/webchat-human-reply/index.ts`

Ajustar a construcao do `n8nPayload` (linhas 134-145):

**De:**
```json
{
  "action": "human_reply",
  "to": "webchat-...",
  "empresa_id": "...",
  "conversa_id": "...",
  "mensagem": "texto",
  "remetente_id": "..."
}
```

**Para:**
```json
{
  "to": "webchat-...",
  "body": "texto",
  "source": "web-chat",
  "channel": "comercial",
  "channel_id": "PUNISH-U4JJA",
  "empresa_id": "...",
  "conversa_id": "...",
  "remetente_id": "..."
}
```

**O que muda no codigo:**

1. Adicionar `whapi_channel_name` ao SELECT da tabela `empresas` (buscar pelo `empresa_id` que ja temos).
2. No payload:
   - Remover `action: 'human_reply'` e `mensagem`
   - Adicionar `body` (= conteudo da mensagem)
   - Adicionar `source: 'web-chat'` (fixo)
   - Usar `channel` da conversa (ja disponivel no select, normalizar para lowercase: "Comercial" → "comercial")
   - Usar `channel_id` = `whapi_channel_name` da empresa

Nenhuma outra alteracao necessaria — o frontend e o hook `useMensagens.ts` continuam enviando os mesmos campos para a edge function. Apenas o payload de saida para o n8n muda.

Apos a alteracao, fazer deploy da edge function.

