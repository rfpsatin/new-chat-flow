

## Problema

Todas as conversas ativas no banco de dados estao com `origem = null` e `channel = null`. O componente `ConversaTags` so exibe o texto do canal quando `channel` e exatamente "Comercial", "Marketing" ou "Fluxo" -- como os valores estao nulos, exibe "---" (traco).

Dados atuais (amostra de 20 conversas ativas):
- 18 conversas: `origem = null`, `channel = null`
- 2 conversas: `origem = null`, `channel = "mkt"` (valor cru, nao normalizado)

## Correcoes

### 1. Deploy da edge function atualizada

A edge function `n8n-webhook-cinemkt` foi editada mas pode nao estar deployada. Sera feito o deploy para garantir que novas mensagens processem `origem` e `channel` corretamente.

### 2. Correcao dos dados existentes no banco

Executar SQL para normalizar os dados das conversas ativas:

```sql
-- Normalizar channel "mkt" para "Marketing"
UPDATE conversas SET channel = 'Marketing' WHERE channel = 'mkt';

-- Normalizar channel "comercial" para "Comercial"
UPDATE conversas SET channel = 'Comercial' WHERE lower(channel) = 'comercial';

-- Normalizar channel "fluxo" para "Fluxo"
UPDATE conversas SET channel = 'Fluxo' WHERE lower(channel) = 'fluxo';
```

### 3. Tornar o ConversaTags mais resiliente

Atualizar `ConversaTags.tsx` para aceitar valores de `channel` em qualquer case (minusculo, maiusculo), normalizando internamente. Isso evita que o problema se repita caso algum dado entre sem normalizacao.

Logica atualizada:
- `channel` normalizado: "comercial" -> "Comercial", "mkt"/"marketing" -> "Marketing", "fluxo" -> "Fluxo"
- Se `channel` nao bate com nenhum conhecido e `origem` e "web-chat" -> "Chat-Web"
- Senao -> "---"

### Arquivo: `src/components/ConversaTags.tsx`

Adicionar normalizacao interna do `channel` antes de determinar o label, em vez de comparar apenas com valores exatos.

### Resultado esperado

- Conversas existentes com `channel = "mkt"` passam a exibir "Marketing"
- Novas conversas recebem `origem` e `channel` corretamente via edge function
- Frontend resiliente a variantes de case/abreviacao
