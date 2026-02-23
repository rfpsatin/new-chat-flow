

## Objetivo

Garantir que a edge function `n8n-webhook-cinemkt` use exclusivamente o campo `origem` (sem fallback para `source`) e que o processamento dos campos `origem` e `channel` resulte corretamente na exibicao visual (cor da bolinha e texto).

## Estado atual

### O que ja funciona corretamente
- **`ConversaTags.tsx`**: Logica de cor e texto ja esta correta:
  - `origem = "web-chat"` → bolinha azul
  - `origem = "whatsapp"` (ou qualquer outro) → bolinha verde
  - `channel = "Comercial" / "Marketing" / "Fluxo"` → texto correspondente
- **Normalizacao de channel**: `comercial` → `Comercial`, `mkt` → `Marketing`, `fluxo` → `Fluxo`
- **Banco de dados**: Coluna ja se chama `origem` (migracao aplicada)

### O que precisa ser ajustado
Na edge function `n8n-webhook-cinemkt/index.ts`:
1. A interface `N8nCinemktPayload` ainda declara o campo `source` (linha 12) — deve ser removido
2. A linha 105 faz fallback para `body.source`: `body.origem ?? body.source ?? null` — deve usar apenas `body.origem`

## Alteracoes

### Arquivo: `supabase/functions/n8n-webhook-cinemkt/index.ts`

**1. Remover `source` da interface (linha 12)**

Antes:
```typescript
interface N8nCinemktPayload {
  to: string
  body: string
  source?: string
  origem?: string
  channel?: string
  human_mode?: boolean
  resposta?: string
}
```

Depois:
```typescript
interface N8nCinemktPayload {
  to: string
  body: string
  /** Origem da mensagem: "web-chat" ou "whatsapp" */
  origem?: string
  channel?: string
  human_mode?: boolean
  resposta?: string
}
```

**2. Remover fallback para `source` (linha 105)**

Antes:
```typescript
const rawOrigem = body.origem ?? body.source ?? null
```

Depois:
```typescript
const rawOrigem = body.origem ?? null
```

## Nenhuma alteracao necessaria em outros arquivos

- `ConversaTags.tsx` — ja processa corretamente `origem` e `channel`
- Banco de dados — coluna ja se chama `origem`
- `types.ts` — ja reflete `origem`

## Resumo do fluxo completo apos a alteracao

```text
n8n envia POST para n8n-webhook-cinemkt:
  { to: "...", body: "...", origem: "whatsapp", channel: "mkt" }

Edge function processa:
  origem = "whatsapp"  (salvo na coluna conversas.origem)
  channel = "Marketing" (normalizado, salvo em conversas.channel)

Frontend ConversaTags exibe:
  🟢 Marketing    (bolinha verde porque origem != "web-chat", texto "Marketing" do channel)

Outro exemplo:
  { origem: "web-chat", channel: "comercial" }
  🔵 Comercial    (bolinha azul porque origem == "web-chat", texto "Comercial")
```
