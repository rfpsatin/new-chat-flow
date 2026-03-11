

## Diagnóstico

Dois problemas encontrados:

1. **`import-contacts` não está registrada no `config.toml`** — sem registro, a função não é deployada, resultando em 500 ao invocar.

2. **Campo `email` inexistente na tabela `contatos`** — a edge function tenta fazer upsert com `email`, mas a tabela não tem essa coluna, causando erro no banco.

Além disso, o "carregando sem fim" provavelmente ocorre porque o erro 500 é capturado mas o estado `isSubmitting` pode não estar sendo resetado corretamente, ou a resposta do erro não está sendo parseada adequadamente pelo `supabase.functions.invoke`.

## Plano

### 1. Atualizar `supabase/functions/import-contacts/index.ts`
- Remover `email` da interface `ImportRow`
- Remover `email` do objeto de upsert (`validRows`)
- Remover `email` do exemplo de resposta 400

### 2. Atualizar `src/pages/ContatosPage.tsx`
- Remover campo `email` do tipo `ImportRow` (linha 28)
- Remover coluna `email` da tabela de preview e do estado `rows`
- Remover `email` do `handleCellChange`
- Remover `email` do payload enviado ao servidor
- Remover `email` do template CSV de download

### 3. Registrar no `supabase/config.toml`
```toml
[functions.import-contacts]
verify_jwt = true
```

### 4. Deploy da edge function `import-contacts`

