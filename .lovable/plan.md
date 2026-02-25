

## Migração: Adicionar coluna `campanha_id` na tabela `conversas`

### Verificação

Confirmei que a coluna `campanha_id` **não existe** na tabela `conversas`. Precisa ser criada.

### SQL da migração

```sql
ALTER TABLE public.conversas
ADD COLUMN campanha_id uuid REFERENCES public.campanhas(id) ON DELETE SET NULL;
```

A coluna será:
- **Tipo**: `uuid`, nullable (nem toda conversa vem de uma campanha)
- **Foreign key**: referencia `campanhas(id)` com `ON DELETE SET NULL` -- se a campanha for removida, a conversa mantém-se mas perde a referência
- **Sem valor default**: conversas existentes ficam com `NULL`

### Impacto no código

Nenhuma alteração de código é necessária imediatamente. A interface `Conversa` em `src/types/atendimento.ts` já pode receber campos opcionais, e o Supabase client aceita a nova coluna automaticamente. Se quiser usar o campo no frontend futuramente, basta adicionar `campanha_id?: string | null` à interface.

