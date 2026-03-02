

## Problema identificado

Existem dois problemas que impedem o POST de reset ao n8n:

### 1. `useEncerramento.ts` — condição de roteamento incorreta

Na linha 101-105, o código seleciona apenas `origem, channel, n8n_webhook_id` e verifica se algum desses existe. Conversas iniciadas manualmente com `origem_final = 'atendente'` têm `human_mode = true` mas **não** têm `origem`, `channel` ou `n8n_webhook_id`. Resultado: a condição `isN8nCinemktConversa` é `false`, e o código cai no caminho do `close-service` (que usa um webhook antigo inativo, retornando 404).

### 2. `n8n-reset-human-mode` — fallback ausente para `n8n_webhook_id`

Quando uma conversa é iniciada manualmente, não há `n8n_webhook_id`. A função retorna erro na linha 56-61 sem enviar o POST. A solução é usar o `whatsapp_numero` do contato como fallback para o campo `to` no payload.

## Plano de alterações

### A. `useEncerramento.ts` (linhas 99-105)

- Adicionar `human_mode, origem_final` ao select da conversa
- Alterar condição: `isN8nCinemktConversa` passa a ser `true` também quando `human_mode === true` ou `origem_final === 'atendente'`
- Isso garante que qualquer conversa com `human_mode=true` acione `n8n-reset-human-mode`

### B. `n8n-reset-human-mode/index.ts` (linhas 33-62)

- Adicionar `contato_id, human_mode, origem_final` ao select da conversa
- Remover a condição que pula conversas sem `origem/channel/n8n_webhook_id` — agora basta `human_mode === true` ou ter `n8n_webhook_id`
- Se `n8n_webhook_id` não existir: buscar `whatsapp_numero` do contato via `contato_id` e usar como `to` no payload
- Manter o POST para `https://n8n.maringaai.com.br/webhook/whatsapp_cinemkt` com `human_mode: false`

