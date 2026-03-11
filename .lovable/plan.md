

## Plano: Corrigir sanitização de nomes nos contatos

### Problema
A função `normalizeNameField` no frontend (`ContatosPage.tsx`, linha 42-49) remove acentos válidos do português (é, ã, ç, etc.), transformando "João" em "Joao".

### Solução

**1. Corrigir `normalizeNameField` no frontend (ContatosPage.tsx)**

Remover a lógica de strip de acentos. A função deve apenas:
- Remover aspas do CSV (já faz via `stripQuotes`)
- Remover caracteres de controle e símbolos inválidos (`@`, `#`, `%`, `*`, etc.)
- Preservar letras acentuadas (é, ã, ç, ü, etc.)
- Colapsar espaços múltiplos

```typescript
function normalizeNameField(raw: string): string {
  const v = stripQuotes(raw);
  return v
    .replace(/["'`«»\u201C\u201D\u2018\u2019]/g, '') // aspas restantes
    .replace(/[\x00-\x1F\x7F]/g, '')                  // controle
    .replace(/[^a-zA-ZÀ-ÿ\s\-\.]/g, '')               // mantém letras (com acento), espaço, hífen, ponto
    .replace(/\s+/g, ' ')
    .trim();
}
```

**2. Backend já está correto** — `sanitizeName` preserva acentos e remove aspas/controle. Nenhuma alteração necessária.

### Resultado
- "João da Silva" → "João da Silva" (preserva acentos)
- `"André"` → `André` (remove aspas, preserva acento)
- `Maria @#$ Costa` → `Maria Costa` (remove símbolos)

