
## Diagnóstico Completo

### Problema 1: Edge Function ignora o campo `chat_name`

O arquivo atual em disco (`supabase/functions/n8n-webhook-cinemkt/index.ts`) está na **versão antiga** (v3). A interface `N8nCinemktPayload` não declara `chat_name`, e a extração do source está na linha 97 como:

```typescript
const source = body.source || null
```

Isso ignora completamente `chat_name`. O webhook do n8n envia `chat_name: "web-chat"`, mas a função nunca o lê — então `source` sempre fica `null` no banco.

### Problema 2: Componente ConversaTags perdeu a lógica de cor

O `ConversaTags.tsx` atual usa `<Badge>` sem distinção de cor azul/verde. A lógica de "círculo azul para web-chat" foi removida numa refatoração anterior. Como `source` é `null` no banco, mesmo que a lógica existisse, não funcionaria.

---

## Solução — dois arquivos

### 1. `supabase/functions/n8n-webhook-cinemkt/index.ts`

**a) Adicionar `chat_name` na interface:**
```typescript
interface N8nCinemktPayload {
  to: string
  body: string
  source?: string
  chat_name?: string   // ← NOVO: campo enviado pelo webhook n8n
  channel?: string
  human_mode?: boolean
  resposta?: string
}
```

**b) Corrigir a extração do source (linha 97):**
```typescript
// Priorizar chat_name sobre source; normalizar para "web-chat"
const rawSource = body.chat_name ?? body.source ?? null
const source = rawSource
  ? rawSource.trim().toLowerCase() === 'web-chat'
    ? 'web-chat'
    : rawSource.trim().toLowerCase()
  : null
```

**c) Atualizar o log para mostrar o chat_name recebido:**
```typescript
console.log(`[${requestId}] chat_name: ${body.chat_name}, source (original): ${body.source}, source (normalizado): ${source}, ...`)
```

Isso garante que quando o n8n envia `chat_name: "web-chat"`, o valor `"web-chat"` seja salvo na coluna `source` da conversa.

---

### 2. `src/components/ConversaTags.tsx`

Restaurar o design de **círculo + texto** com a lógica de cor correta:

**Lógica de cor:**
- **Círculo azul escuro** → quando `source === 'web-chat'` **OU** `channel` for `Marketing`/`Comercial`
- **Círculo verde escuro** → quando não há indicação de canal digital (WhatsApp puro)

**Tabela de rótulos:**

| source | channel | Rótulo exibido | Cor |
|---|---|---|---|
| `web-chat` | `Marketing` | Marketing | Azul |
| `web-chat` | `Comercial` | Comercial | Azul |
| `web-chat` | nulo | Chat-Web | Azul |
| nulo | `Marketing` | Marketing | Azul |
| nulo | `Comercial` | Comercial | Azul |
| nulo | `WhatsApp` | WhatsApp | Verde |
| nulo | nulo | WhatsApp | Verde |

O componente retorna:
```tsx
<div className="flex items-center gap-1.5 ...">
  <span className={cn('rounded-full w-2 h-2', isWebChat ? 'bg-blue-700' : 'bg-green-700')} />
  <span className="truncate">{label}</span>
</div>
```

---

## Arquivos modificados

1. **`supabase/functions/n8n-webhook-cinemkt/index.ts`** — adicionar `chat_name` na interface e corrigir extração do `source`
2. **`src/components/ConversaTags.tsx`** — restaurar design círculo + texto com lógica azul/verde correta

Após o deploy da edge function, novas mensagens receberão `source = "web-chat"` corretamente. Conversas existentes no banco que têm `channel = "Marketing"` ou `"Comercial"` mas `source = null` já serão exibidas corretamente porque o componente usa `channel` como critério de cor quando `source` está ausente.
