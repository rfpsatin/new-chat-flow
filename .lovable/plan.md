

## Plano: Redeploy de todas as funções dos últimos commits

### Problema
A função `whapi-media` existe no código mas **não está registrada** no `supabase/config.toml`, impedindo seu deploy. As demais funções alteradas precisam ser redeployadas.

### Ações

1. **Adicionar ao `supabase/config.toml`:**
```toml
[functions.whapi-media]
verify_jwt = false
```
(verify_jwt = false porque é chamada pelo browser para download de mídia)

2. **Deployar as 5 funções dos últimos commits:**
   - `whapi-webhook` (voice/audio)
   - `n8n-send-message` (human_mode marker)
   - `conversation-attendance-status`
   - `buscar-empresa` (channel_id)
   - `whapi-media` (proxy de mídia)

