
## Plano: Deploy e correção das edge functions n8n

### Problema identificado
As colunas `source`, `channel`, `n8n_webhook_id` e `human_mode` ainda nao existem na tabela `conversas` no banco de dados. Isso causa:
1. **Erro de build** no TypeScript (`useEncerramento.ts` tenta selecionar essas colunas)
2. **Falha nas edge functions** `n8n-webhook-cinemkt` e `n8n-reset-human-mode` que escrevem/leem essas colunas

### Etapas

**1. Migrar banco de dados**
Adicionar as 4 colunas que faltam na tabela `conversas`:
- `source` (text, nullable)
- `channel` (text, nullable)  
- `n8n_webhook_id` (text, nullable)
- `human_mode` (boolean, default false)

**2. Deploy das edge functions**
Fazer deploy de `n8n-webhook-cinemkt` e `n8n-reset-human-mode` que ja existem no codigo.

**3. Corrigir erro de build**
Apos a migracao, os tipos serao regenerados automaticamente e o erro em `useEncerramento.ts` sera resolvido (as colunas passarao a existir no tipo gerado).

### Detalhes tecnicos

```text
SQL Migration:
  ALTER TABLE public.conversas
    ADD COLUMN IF NOT EXISTS source text,
    ADD COLUMN IF NOT EXISTS channel text,
    ADD COLUMN IF NOT EXISTS n8n_webhook_id text,
    ADD COLUMN IF NOT EXISTS human_mode boolean DEFAULT false;
```

Edge functions a deployar:
- `supabase/functions/n8n-webhook-cinemkt/index.ts`
- `supabase/functions/n8n-reset-human-mode/index.ts`

Ambas ja estao configuradas em `supabase/config.toml` com `verify_jwt = false`.
