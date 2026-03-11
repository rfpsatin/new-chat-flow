

# Plano: Sistema de Respostas (Replies) Bidirecional

## Problemas Identificados

1. **Webhook recebendo `context.ephemeral` como reply**: Nos logs, mensagens do cliente chegam com `"context": {"ephemeral": 1731012635}` — o código atual trata qualquer `context` como reply, gerando falsos positivos. O `context` só indica reply quando tem `.id` ou `.message_id` apontando para uma mensagem.

2. **Mensagens enviadas pelo Hub não gravam `whatsapp_message_id`**: O `useEnviarMensagem` insere em `mensagens_ativas` sem o campo `whatsapp_message_id`. Resultado: quando o cliente responde uma mensagem do atendente, o webhook não consegue encontrar a mensagem original (lookup por `whatsapp_message_id` falha).

3. **Outgoing messages (bot) no webhook também não gravam `whatsapp_message_id`**: A inserção de mensagens `from_me=true` (bot) na linha 263-273 do webhook não inclui `whatsapp_message_id: message.id`.

## Alterações Necessárias

### 1. Edge Function `whapi-webhook` — Corrigir detecção de reply

Na seção de detecção de reply (linhas 386-400), filtrar `context` que não contém `id` nem `message_id`:

```
const rawQuotedAny =
  message.quotedMsg ??
  message.quoted ??
  null  // context sozinho NÃO indica reply

// Se context tiver .id ou .message_id, usar como fallback
if (!rawQuotedAny && message.context) {
  const ctx = message.context
  if (typeof ctx === 'object' && (ctx.id || ctx.message_id)) {
    rawQuotedAny = ctx
  }
}
```

### 2. Edge Function `whapi-webhook` — Gravar `whatsapp_message_id` em mensagens bot (from_me=true)

Na inserção de mensagens de saída (bot) nas linhas 263-273, adicionar:
```
whatsapp_message_id: message.id,
```

### 3. Edge Function `whapi-send-message` — Retornar `message_id` do Whapi na resposta

Já retorna `message_id: whapiData.messages?.[0]?.id`. Sem mudança necessária aqui.

### 4. Hook `useEnviarMensagem` — Capturar e gravar `whatsapp_message_id`

Mover a inserção em `mensagens_ativas` para DENTRO da edge function `whapi-send-message` (ou fazer update após o envio). A abordagem mais limpa: após o `supabase.functions.invoke`, pegar o `message_id` retornado e incluí-lo no insert, ou fazer um UPDATE na mensagem recém-inserida.

Opção escolhida: inserir com `whatsapp_message_id` obtido do retorno da edge function.

```typescript
// Chamar edge function primeiro
const { data: sendResult } = await supabase.functions.invoke('whapi-send-message', ...);
const whapiMessageId = sendResult?.message_id ?? null;

// Depois inserir com o ID
await supabase.from('mensagens_ativas').insert({
  ...campos,
  whatsapp_message_id: whapiMessageId,
});
```

### 5. Edge Function `whapi-send-media` — Gravar `whatsapp_message_id` na inserção

Verificar se a inserção em `mensagens_ativas` dentro de `whapi-send-media` inclui o `whatsapp_message_id` retornado pelo Whapi.

### 6. Redeploy das 3 edge functions

- `whapi-webhook`
- `whapi-send-message` (sem mudanças, mas confirmar deploy)
- `whapi-send-media` (se alterada)

## Resumo do Fluxo Corrigido

- **Cliente responde mensagem** → Whapi envia `quotedMsg` ou `context.id` → webhook resolve para `reply_to_message_id` → Hub exibe citação
- **Atendente responde mensagem** → Hub envia com `reply_to_whatsapp_id` → edge function envia `quoted` ao Whapi → WhatsApp mostra como reply → mensagem gravada com `whatsapp_message_id` para futura resolução

