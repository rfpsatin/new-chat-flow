

## Problema: Mensagem de campanha enviada em duplicidade

### Causa raiz

O `run-campaigns` está enviando cada mensagem **duas vezes**:

1. **Linha 122** - Chama `whapi-send-message` diretamente (envia no WhatsApp)
2. **Linha 142** - Chama `start-conversation`, que **internamente também chama** `whapi-send-message` (envia no WhatsApp de novo) e registra em `mensagens_ativas`

Resultado: o contato recebe a mesma mensagem duas vezes no WhatsApp.

### Solução

Remover a chamada direta ao `whapi-send-message` (linhas 110-133) e usar **somente** o `start-conversation`, que já faz tudo:
- Envia a mensagem via WhatsApp (com marcador de `human_mode`)
- Registra em `mensagens_ativas`
- Cria/reutiliza conversa
- Atribui agente se necessário

### Alteração no `run-campaigns/index.ts`

Substituir o fluxo atual (send + start-conversation separados) por uma única chamada ao `start-conversation`, verificando o resultado para marcar o destinatário como `enviado` ou `erro_envio`. Basicamente:

```
// ANTES (duplicado):
// 1. fetch(whapi-send-message) → envia WhatsApp
// 2. fetch(start-conversation) → envia WhatsApp DE NOVO + cria conversa

// DEPOIS (correto):
// 1. fetch(start-conversation) → envia WhatsApp + cria conversa (tudo em um)
```

O loop do `for (const dest of destinatarios)` ficará:
- Marca destinatário como `enviando`
- Chama `start-conversation` com `empresa_id`, `contato_id`, `mensagem_inicial`, `origem_inicial: 'campanha'`, `origem_final`, `campanha_id`
- Se sucesso: marca `enviado` e salva `conversa_id` retornado
- Se erro: marca `erro_envio`

### Arquivo alterado
- `supabase/functions/run-campaigns/index.ts`

