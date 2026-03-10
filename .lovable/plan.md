

## Plano: Garantir deploy de `conversation-attendance-status` e `n8n-send-message`

### Problema
Ambas as funções existem no código mas **não estão registradas** no `supabase/config.toml`, o que impede o deploy automático.

### Ação

Adicionar ao `supabase/config.toml`:

```toml
[functions.conversation-attendance-status]
verify_jwt = false

[functions.n8n-send-message]
verify_jwt = false
```

Ambas usam `verify_jwt = false` porque são chamadas externamente (n8n/webhooks) e já validam autenticação via `x-webhook-secret` no próprio código.

Após a atualização do config, executar o deploy das duas funções.

