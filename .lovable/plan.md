

## Plano: Corrigir deploy da edge function n8n-webhook-cinemkt

### Problema identificado
A edge function `n8n-webhook-cinemkt` retorna **404 (NOT_FOUND)** ao ser chamada, mesmo apos o deploy reportar sucesso. Outras edge functions como `whapi-status` funcionam normalmente. O deploy parece nao estar sendo efetivado para esta funcao especifica.

### Causa provavel
O deploy pode estar falhando silenciosamente ou o cache do deploy anterior nao esta sendo invalidado. Uma pequena alteracao no codigo forca um novo hash e um deploy efetivo.

### Solucao

**1. Adicionar comentario de versao no topo da funcao para forcar novo deploy**
Adicionar uma linha de comentario no inicio do arquivo `supabase/functions/n8n-webhook-cinemkt/index.ts`:
```text
// n8n-webhook-cinemkt v2
```

**2. Fazer o mesmo para n8n-reset-human-mode**
Adicionar comentario similar em `supabase/functions/n8n-reset-human-mode/index.ts`.

**3. Fazer deploy das duas funcoes**
Executar o deploy de ambas as funcoes.

**4. Testar chamada**
Validar que a funcao responde corretamente (nao mais 404) enviando um POST de teste com `empresa_id` valido.

### Detalhes tecnicos

Arquivos a editar:
- `supabase/functions/n8n-webhook-cinemkt/index.ts` - adicionar comentario na linha 1
- `supabase/functions/n8n-reset-human-mode/index.ts` - adicionar comentario na linha 1

Apos editar, fazer deploy e testar com curl para confirmar que a funcao esta ativa.

