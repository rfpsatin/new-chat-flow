

## Problema

A edge function `conversation-attendance-status` usa `onlyDigits()` para limpar o numero recebido. Para contatos web-chat, o `whatsapp_numero` armazenado e `webchat-XXXX`, mas `onlyDigits()` remove todas as letras e hifens, resultando em apenas digitos que nao batem com nenhum registro na tabela `contatos`. Por isso a funcao sempre retorna `human_mode: false` para conversas webchat.

## Solucao

Alterar **um unico arquivo**: `supabase/functions/conversation-attendance-status/index.ts`

1. **Detectar identificador webchat** antes de aplicar `onlyDigits()`:
   - Se o valor comecar com `webchat-`, preservar o valor original.
   - Caso contrario, aplicar `onlyDigits()` normalmente.

2. **Ajustar a query de busca no banco**:
   - Se webchat: busca exata por `whatsapp_numero = valor_original`.
   - Se WhatsApp normal: manter busca atual com/sem sufixo `@s.whatsapp.net`.

3. **Redeploy** da edge function.

## Codigo

```typescript
// ANTES (sempre remove letras):
const numeroDigits = onlyDigits(numero ?? '')

// DEPOIS (preserva identificador webchat):
const raw = (numero ?? '').trim()
const isWebchat = raw.toLowerCase().startsWith('webchat-')
const numeroBusca = isWebchat ? raw : onlyDigits(raw)
```

Query de contatos:

```typescript
let contatoQuery = supabase
  .from('contatos')
  .select('id')
  .eq('empresa_id', empresaId)

if (isWebchat) {
  contatoQuery = contatoQuery.eq('whatsapp_numero', numeroBusca)
} else {
  contatoQuery = contatoQuery.or(
    `whatsapp_numero.eq.${numeroBusca},whatsapp_numero.eq.${numeroBusca}@s.whatsapp.net`
  )
}

const { data: contato, error: contatoErr } = await contatoQuery
  .limit(1)
  .maybeSingle()
```

Validacao do parametro tambem precisa aceitar webchat:

```typescript
if (!empresaId || !numeroBusca) {
  // retorna erro 400
}
```

