

## Garantir deploy da edge function `start-conversation`

### Problema

A function `start-conversation` existe no codigo (`supabase/functions/start-conversation/index.ts`) mas **nao esta registrada no `supabase/config.toml`**. Sem a entrada no config, a function nao e deployada automaticamente e chamadas do frontend falham.

Alem disso, os CORS headers estao incompletos -- faltam headers que o cliente envia automaticamente (`x-supabase-client-platform`, etc.), o que pode causar falhas no preflight.

### Correcoes

#### 1. Adicionar entrada no `supabase/config.toml`

Adicionar:

```toml
[functions.start-conversation]
verify_jwt = false
```

Isso registra a function para deploy automatico. `verify_jwt = false` e necessario porque o frontend chama com a anon key (mesmo padrao das demais functions do projeto).

#### 2. Atualizar CORS headers em `start-conversation/index.ts`

Trocar a linha 6:

```typescript
'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
```

Por:

```typescript
'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
```

### Nenhuma outra alteracao necessaria

O codigo da function esta correto. O hook `useStartConversation` ja constroi a URL corretamente. Apos essas duas alteracoes, a function sera deployada e acessivel pelo frontend.

