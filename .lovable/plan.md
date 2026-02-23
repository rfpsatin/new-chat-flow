

## Problema

1. **43 conversas com `origem = NULL`** -- o backfill anterior so atualizou conversas ativas (`status != 'encerrado'`), deixando as encerradas sem origem.
2. **Label incorreto** -- quando `origem = "whatsapp"` e nao ha channel, o componente exibe "---" em vez de "WhatsApp".

## Correcoes

### 1. Backfill completo de todas as conversas

Atualizar TODAS as conversas (ativas e encerradas) que ainda tem `origem = NULL`:

- Conversas com mensagens contendo `payload->>'origem' = 'web-chat'` ou `payload->>'chat_name' = 'web-chat'` -> `origem = 'web-chat'`
- Todas as demais com `origem IS NULL` -> `origem = 'whatsapp'`

Isso sera feito consultando tanto `mensagens_ativas` quanto `mensagens_historico` (onde ficam as mensagens de conversas encerradas).

### 2. Atualizar `ConversaTags.tsx`

Ajustar a logica de label para que, quando `origem = "whatsapp"` e nao ha channel reconhecido, exiba "WhatsApp" em vez de "---":

- channel reconhecido (Comercial, Marketing, Fluxo) -> exibe o channel
- sem channel + origem web-chat -> "Chat-Web"
- sem channel + origem whatsapp (ou qualquer outro) -> "WhatsApp"

### Resultado esperado

- Todas as 43 conversas sem origem passam a ter `origem = 'whatsapp'` (ou `'web-chat'` se identificadas nos payloads)
- Conversas whatsapp sem channel exibem "🟢 WhatsApp"
- Conversas web-chat sem channel exibem "🔵 Chat-Web"
- Conversas com channel exibem a bolinha colorida + nome do channel

### Detalhes tecnicos

**Arquivo**: `src/components/ConversaTags.tsx`
- Linha 33: trocar `label = '—'` por `label = 'WhatsApp'`

**SQL** (via insert tool):
```sql
-- Identificar web-chat em mensagens historicas
UPDATE conversas SET origem = 'web-chat'
WHERE origem IS NULL AND id IN (
  SELECT DISTINCT conversa_id FROM mensagens_historico
  WHERE payload->>'origem' = 'web-chat' OR payload->>'chat_name' = 'web-chat'
);

-- Todas as restantes sem origem -> whatsapp
UPDATE conversas SET origem = 'whatsapp'
WHERE origem IS NULL;
```

