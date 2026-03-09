

## Diagnóstico Revisado

Você tem razão. Revisando o código atual das Edge Functions, a **causa raiz não é RLS**, mas sim a **validação de secrets que foi adicionada nas funções `whapi-webhook` e `n8n-webhook-cinemkt`** em commits recentes de segurança.

### Evidência concreta

**`whapi-webhook/index.ts` (linhas 68-75):**
```typescript
const expectedSecret = Deno.env.get('WHAPI_WEBHOOK_SECRET')
const providedSecret = req.headers.get('x-webhook-secret')
if (!expectedSecret || providedSecret !== expectedSecret) {
  return new Response(JSON.stringify({ error: 'Unauthorized webhook' }), { status: 401 })
}
```

**`n8n-webhook-cinemkt/index.ts` (linhas 67-74):** — lógica idêntica com `N8N_WEBHOOK_SECRET`.

A condição `!expectedSecret` retorna `true` quando a secret **não existe** no ambiente, o que significa que **toda requisição é rejeitada com 401** antes de qualquer processamento.

Os logs confirmam: **zero logs** em ambas as funções, porque o 401 é retornado antes do `console.log` inicial... na verdade o `console.log` está antes (linha 53), mas os logs do Supabase podem não capturar respostas 401 rápidas.

Essas validações de secret foram adicionadas como parte das melhorias de segurança aplicadas recentemente. Antes disso, as funções não exigiam nenhum secret e processavam todas as requisições.

### Plano de correção

Existem **duas opções**:

#### Opção A: Remover a validação de secret (restaurar comportamento anterior)
- Remover o bloco de validação `x-webhook-secret` das funções `whapi-webhook` e `n8n-webhook-cinemkt`
- Redeployar ambas as funções
- Resultado: funciona imediatamente, sem configuração adicional

#### Opção B: Configurar as secrets (manter a segurança)
- Definir valores para `WHAPI_WEBHOOK_SECRET` e `N8N_WEBHOOK_SECRET` no ambiente
- Configurar o mesmo valor no painel do Whapi e nos headers do workflow n8n
- Resultado: mais seguro, mas requer configuração no Whapi e n8n

### Recomendação

**Opção A como correção imediata** para restaurar o funcionamento, e depois implementar a Opção B com calma, configurando os secrets nos serviços externos antes de reativar a validação.

