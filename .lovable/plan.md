

## Adicionar `human_mode: false` ao payload do n8n-reset-human-mode

### Alteração

Arquivo: `supabase/functions/n8n-reset-human-mode/index.ts`

No payload enviado ao n8n (linha 67-71), adicionar o campo `human_mode: false`:

```typescript
const payload = {
  action: 'reset_human_mode',
  to: conversa.n8n_webhook_id,
  conversa_id: conversa_id,
  human_mode: false,
}
```

Isso garante que o fluxo n8n receba explicitamente a variável `human_mode = false` ao encerrar a conversa, permitindo que o n8n atualize seu estado interno corretamente.

### Impacto

- Única linha adicionada ao payload
- Deploy automático da Edge Function
- Nenhuma alteração de schema ou frontend necessária

