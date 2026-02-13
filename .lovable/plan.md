
# Exibir mensagens completas do bot para o atendente

## Problema atual
A funcao `extractMessageContent` no webhook nao reconhece os tipos `interactive` e `list` enviados pelo bot. Esses tipos caem no `default` e sao salvos como `[interactive]` ou `[list]` no banco, perdendo todo o conteudo textual.

## Payload real recebido do Whapi (exemplos dos logs)

**Tipo `interactive` (botoes):**
```text
{
  "type": "interactive",
  "interactive": {
    "header": "Maia Beach Tennis Demo",
    "body": "Ola! Seja bem-vindo(a)...",
    "footer": "Escolha uma opcao abaixo:",
    "buttons": [
      { "text": "Agendar", "id": "ButtonsV3:sim_agendar" },
      { "text": "Ver ou cancelar reservas", "id": "..." },
      { "text": "Falar com atendente humano", "id": "..." }
    ]
  }
}
```

**Tipo `list` (lista interativa):**
```text
{
  "type": "list",
  "list": {
    "header": "Perfeito! Vamos dar inicio...",
    "body": "Para que possamos mostrar...",
    "footer": "Escolha uma opcao abaixo:",
    "sections": [
      { "title": "Servicos disponiveis", "rows": [
        { "title": "Quadra Coberta p/ Beach Tennis" },
        { "title": "Quadra p/ Beach Tennis" }
      ]}
    ]
  }
}
```

## Alteracoes

### 1. Edge Function `whapi-webhook/index.ts` - Melhorar `extractMessageContent`

Adicionar cases para `interactive` e `list` na funcao `extractMessageContent`:

**Case `interactive`:** Concatenar header + body + footer + lista dos botoes
```text
Exemplo de saida:
"Maia Beach Tennis Demo
Ola! Seja bem-vindo(a) a nossa Central de Agendamentos.
Escolha uma opcao abaixo:
- Agendar
- Ver ou cancelar reservas
- Falar com atendente humano"
```

**Case `list`:** Concatenar header + body + footer + items das secoes
```text
Exemplo de saida:
"Perfeito! Vamos dar inicio ao seu agendamento.
Para que possamos mostrar as informacoes corretas...
Escolha uma opcao abaixo:
- Quadra Coberta p/ Beach Tennis
- Quadra p/ Beach Tennis
- Quadra p/ Futebol
- Quadra p/ Volei
- Sair do menu"
```

Tambem atualizar a interface `WhapiMessage` para incluir os campos `interactive` e `list`.

### 2. Frontend `ChatPanel.tsx` - Melhorar `getDisplayContent`

Atualizar a funcao `getDisplayContent` no `MessageBubble` para tratar mensagens que foram salvas anteriormente como `[list]` ou `[interactive]`, extraindo o conteudo do payload quando disponivel.

Para mensagens novas, o conteudo ja vira completo do webhook (alteracao acima). Para mensagens antigas que ja estao como `[list]` ou `[interactive]`, o payload completo ja esta salvo na coluna `payload` - basta extrair dele.

### Secao tecnica

**Arquivo:** `supabase/functions/whapi-webhook/index.ts`

Adicionar na interface `WhapiMessage`:
```text
interactive?: {
  header?: string
  body?: string
  footer?: string
  buttons?: Array<{ text: string; id: string }>
}
list?: {
  header?: string
  body?: string
  footer?: string
  label?: string
  sections?: Array<{ title: string; rows: Array<{ id: string; title: string }> }>
}
```

Adicionar no switch de `extractMessageContent`:
```text
case 'interactive': {
  const parts: string[] = []
  if (message.interactive?.header) parts.push(message.interactive.header)
  if (message.interactive?.body) parts.push(message.interactive.body.trim())
  if (message.interactive?.footer) parts.push(message.interactive.footer)
  if (message.interactive?.buttons?.length) {
    parts.push(message.interactive.buttons.map(b => `• ${b.text}`).join('\n'))
  }
  return parts.join('\n') || '[mensagem interativa]'
}
case 'list': {
  const parts: string[] = []
  if (message.list?.header) parts.push(message.list.header)
  if (message.list?.body) parts.push(message.list.body.trim())
  if (message.list?.footer) parts.push(message.list.footer)
  if (message.list?.sections?.length) {
    const items = message.list.sections.flatMap(s => s.rows.map(r => `• ${r.title}`))
    parts.push(items.join('\n'))
  }
  return parts.join('\n') || '[lista interativa]'
}
```

**Arquivo:** `src/components/ChatPanel.tsx`

Na funcao `getDisplayContent`, adicionar tratamento para `[interactive]` e `[list]`:
```text
// Mensagem interativa (payload do bot)
if (mensagem.conteudo === '[interactive]' && mensagem.payload) {
  const payload = mensagem.payload as any
  const parts: string[] = []
  if (payload.interactive?.header) parts.push(payload.interactive.header)
  if (payload.interactive?.body) parts.push(payload.interactive.body.trim())
  if (payload.interactive?.buttons?.length) {
    parts.push(payload.interactive.buttons.map(b => `• ${b.text}`).join('\n'))
  }
  if (parts.length > 0) return parts.join('\n')
}

// Lista interativa (payload do bot)
if (mensagem.conteudo === '[list]' && mensagem.payload) {
  // (mesmo padrao, extraindo de payload.list)
}
```

Tambem atualizar o mesmo tratamento em `SessaoCard.tsx` para o historico.
