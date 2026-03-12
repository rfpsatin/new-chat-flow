

## Plano: Ajustes no modulo de importacao de contatos

### Diagnostico

O codigo ja possui a maior parte da logica solicitada (contadores, botao de relatorio, validacao, import_tag). O problema principal e que a Edge Function `import-contacts` envia `tp_contato` e `tag_origem` no upsert, mas essas colunas **nao existem** na tabela `contatos`. Isso causa falha silenciosa ou erro 500.

### Alteracoes necessarias

#### 1. Migration: adicionar colunas `tp_contato` e `tag_origem` na tabela `contatos`

```sql
ALTER TABLE public.contatos
  ADD COLUMN IF NOT EXISTS tp_contato text NOT NULL DEFAULT 'N',
  ADD COLUMN IF NOT EXISTS tag_origem text;
```

Valores: `'I'` = importado, `'N'` = normal (default).

#### 2. Edge Function `import-contacts/index.ts` — fallback resiliente

Adicionar try/catch no upsert: se falhar com erro de coluna inexistente, tentar novamente sem `tp_contato` e `tag_origem`. Isso garante que a importacao nunca quebra por causa dessas colunas.

#### 3. Frontend `ContatosPage.tsx` — ajustes no texto do resumo

- Trocar "rejeitado(s) no servidor" por "nao adicionado(s)" no resumo final (linha 783).
- Garantir que o total de "nao adicionados" inclui invalidos do frontend + rejeitados do backend (ja esta implementado nas linhas 617-651, apenas ajustar o texto).

### Sem alteracoes

- Logica de validacao de telefone (ja correta)
- Botao "Gerar relatorio de erros" (ja existe e aparece quando ha invalidos)
- Contadores (ja exibidos)
- Formatacao de telefone (ja implementada)
- Envio de `import_tag` (ja enviado como nome do arquivo)

