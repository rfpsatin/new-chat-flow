

## Plano: Passos pós-commit para suporte a documentos

### 1. Aplicar migration no banco
Executar a migration `20260306120000_add_document_media_to_mensagens_ativas.sql` via ferramenta de migração para criar as colunas `media_url`, `media_kind`, `media_filename` e `media_mime` na tabela `mensagens_ativas`.

### 2. Corrigir erro de build em `create-user-auth/index.ts`
O erro `TS18046: 'err' is of type 'unknown'` na linha 98. Corrigir com cast:
```typescript
} catch (err) {
  const message = err instanceof Error ? err.message : 'Erro desconhecido';
  return new Response(JSON.stringify({ error: message }), { ... });
}
```

### 3. Validar payload Whapi para documentos
A interface `WhapiMessage` já define `document?: { filename?: string; link?: string }` (linha 24-27) e a função `extractDocumentFromMessage` já usa `message.document?.link` e `message.document?.filename`. Isso está alinhado com a documentação do Whapi. Nenhuma alteração necessária.

### 4. Tipos TypeScript
Os tipos são gerados automaticamente pelo Lovable Cloud após a migration. O arquivo `src/integrations/supabase/types.ts` será atualizado automaticamente — não precisa de ação manual.

### Arquivos alterados
- **Migration**: `20260306120000_add_document_media_to_mensagens_ativas.sql` (executar no banco)
- **`supabase/functions/create-user-auth/index.ts`**: fix do erro TypeScript na linha 98

