

## Problema

Todas as 30 conversas ativas tem `origem = null` no banco. O componente `ConversaTags` depende desse campo para decidir a cor da bolinha (verde = whatsapp, azul = web-chat), mas como esta null, tudo aparece como verde por padrao.

## Diagnostico (dados reais do banco)

Analisando os payloads das mensagens, identifiquei a origem real de cada conversa:

**Conversas web-chat** (bolinha azul):
- `7cccf981` - payload tem `origem: "web-chat"`
- `240a7a41` - payload tem `chat_name: "web-chat"` 
- `cba76267` - payload tem `chat_name: "web-chat"`
- `ee999dd4` - payload tem `chat_name: "web-chat"`

**Todas as demais** - sao WhatsApp (bolinha verde), vindas do fluxo n8n sem indicacao de web-chat ou diretamente do whapi-webhook.

## Correcoes

### 1. Backfill dos dados existentes (SQL)

Atualizar a coluna `origem` de todas as conversas ativas com base nos payloads das mensagens:

```sql
-- Conversas que tem pelo menos uma mensagem com origem ou chat_name = 'web-chat'
UPDATE conversas SET origem = 'web-chat'
WHERE id IN (
  SELECT DISTINCT conversa_id FROM mensagens_ativas
  WHERE payload->>'origem' = 'web-chat' OR payload->>'chat_name' = 'web-chat'
);

-- Todas as outras conversas ativas sem origem definida = whatsapp
UPDATE conversas SET origem = 'whatsapp'
WHERE origem IS NULL AND status != 'encerrado';
```

### 2. Corrigir a edge function `n8n-webhook-cinemkt`

A edge function ja normaliza `origem` corretamente, mas quando o payload nao envia o campo `origem`, o valor fica `null`. Como o usuario afirmou que o campo `origem` **sempre** vem no payload, nao ha necessidade de fallback -- mas vou garantir que o log indique quando `origem` esta ausente para facilitar debug futuro.

Nenhuma alteracao de codigo necessaria na edge function -- ela ja processa `body.origem` corretamente apos a edicao anterior.

### 3. Frontend - sem alteracoes

O `ConversaTags.tsx` ja esta correto: normaliza `origem` e `channel` internamente e exibe a cor/texto adequados. O problema era exclusivamente dados nulos no banco.

## Resultado esperado

Apos o backfill:
- 4 conversas exibirao bolinha azul (web-chat) com seus respectivos canais
- Todas as demais exibirao bolinha verde (whatsapp) com seus canais (Marketing, Comercial, etc.) ou "---" quando sem channel

