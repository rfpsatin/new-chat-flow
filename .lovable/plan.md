

## Sanitizar nomes na importação de contatos

### Alteração

Adicionar função `sanitizeName` em `supabase/functions/import-contacts/index.ts` que:
- Remove todos os tipos de aspas: `"`, `'`, `` ` ``, `«`, `»`, `"`, `"`, `'`, `'`
- Remove caracteres de controle (tabs, newlines, etc.)
- Colapsa espaços múltiplos em um só
- Trim final

Aplicar na linha que monta `validRows`: `nome: sanitizeName(r.nome) || null`

Redeploy da edge function.

