
# Atualizar payload do close-service para n8n

## Resumo
Alterar o payload enviado ao webhook do n8n para:
1. Renomear `chat_id` para `numero_participante`
2. Substituir `empresa_id` pelo `whapi_token` da empresa, enviado como `channel_ID`

## Alteracoes

### `supabase/functions/close-service/index.ts`

**1. Alterar a funcao `updateAttendanceMode`**
- Trocar a assinatura para receber `whatsappNumero` e `channelId` em vez de `chatId` e `empresaId`
- Payload enviado ao n8n passara a ser:

```text
{
  "attendanceMode": "automated",
  "action": "update",
  "numero_participante": "<numero whatsapp do contato>",
  "channel_ID": "<whapi_token da empresa>",
  "conversa_id": "<id da conversa>"
}
```

**2. Buscar whapi_token da empresa no banco**
- Apos resolver o chat_id (numero do contato), tambem buscar o `whapi_token` da tabela `empresas` usando o `empresa_id` recebido na request
- Enviar esse token como `channel_ID` no payload

**3. Fluxo completo da funcao**
- Receber `conversa_id`, `empresa_id`, `chat_id` (opcional) da request
- Se `chat_id` nao fornecido, buscar via conversas -> contatos (logica existente)
- Buscar `whapi_token` da tabela `empresas` onde `id = empresa_id`
- Montar payload com `numero_participante`, `channel_ID` e `conversa_id`
- POST para o webhook do n8n

### Secao tecnica

Campos removidos do payload: `empresa_id`, `chat_id`
Campos adicionados: `numero_participante` (mesmo valor do antigo `chat_id`), `channel_ID` (valor de `empresas.whapi_token`)

Query adicional necessaria:
```text
supabase.from('empresas').select('whapi_token').eq('id', empresa_id).single()
```

O Supabase client ja esta sendo criado na funcao quando precisa buscar dados; sera reutilizado. Caso o `chat_id` ja venha na request, o client sera criado de qualquer forma para buscar o `whapi_token`.
