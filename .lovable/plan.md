

## Migração: Adicionar coluna `origem_inicial` na tabela `conversas`

### Problema

A edge function `start-conversation` já insere o campo `origem_inicial` ao criar conversas, mas a coluna não existe na tabela. Isso causa erro silencioso no insert.

### SQL da migração

```sql
ALTER TABLE public.conversas
ADD COLUMN origem_inicial text;
```

- **Tipo**: `text`, nullable
- **Sem default**: conversas existentes ficam com `NULL`
- Valores esperados: `'agente'`, `'sistema'`, `'campanha'`

### Impacto no código

Nenhuma alteração necessária. A edge function `start-conversation` já envia esse campo no insert. O tipo `Conversa` em `src/types/atendimento.ts` já aceita campos opcionais extras via o client Supabase.

