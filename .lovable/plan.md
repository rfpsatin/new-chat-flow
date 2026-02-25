

## Corrigir duplicação de mensagens no webhook `whapi-webhook`

### Problema

Quando o agente inicia uma conversa ou envia mensagem, ela é gravada no banco por `start-conversation`, `whapi-send-message` ou `useEnviarMensagem`. Depois, a Whapi envia o webhook de volta com `from_me: true` e o webhook insere a **mesma mensagem novamente**, causando duplicação na interface.

### Correção

No loop de processamento de mensagens em `supabase/functions/whapi-webhook/index.ts`, adicionar um `continue` imediato quando `from_me === true`, logo após detectar `isFromBot`. Isso elimina todo o processamento de mensagens de saída, que já são registradas na origem.

Também remover o bloco morto (linhas 149-193) que tenta buscar contato/conversa para mensagens de bot — esse código nunca será alcançado após o `continue`.

#### Alteração (linha 137-193 → simplificado)

```typescript
const isFromBot = message.from_me === true

// Mensagens de saída (from_me=true) já são registradas por
// start-conversation, whapi-send-message, n8n-webhook, etc.
// Inserir aqui causaria duplicação.
if (isFromBot) {
  console.log(`[${requestId}] Outgoing message (from_me=true), skipping to avoid duplicate`)
  continue
}

// Daqui para baixo, apenas mensagens de entrada (cliente)
const whatsappNumero = message.from
  .replace('@s.whatsapp.net', '')
  .replace('@c.us', '')

console.log(`[${requestId}] WhatsApp number: ${whatsappNumero}`)

let contato: any
let conversa: any

// Client messages: find or create contact and conversation
contato = await findOrCreateContato(
  supabase,
  empresaId,
  whatsappNumero,
  message.from_name,
  requestId
)

if (!contato) {
  throw new Error('Failed to find or create contact')
}
```

E nas linhas seguintes, remover os `if (!isFromBot)` que envolviam a criação de conversa e a detecção de pedido de atendimento humano, já que agora **todas** as mensagens que chegam a esse ponto são de entrada. Simplifica leitura e elimina código morto.

### Impacto

- Nenhuma alteração de frontend necessária
- A inserção de mensagem em `mensagens_ativas` continua normalmente para mensagens de entrada (`in/cliente`)
- Mensagens de saída continuam sendo registradas apenas uma vez, na origem

