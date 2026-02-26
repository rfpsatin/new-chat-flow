

## Corrigir: mensagens do agente não aparecem mais

### Causa raiz

Na correção anterior de duplicação, desabilitamos o processamento de mensagens `from_me=true` no `whapi-webhook`. Porém, **nenhuma** das fontes de envio insere a mensagem em `mensagens_ativas` — todas dependiam do webhook para isso. O comentário no código confirma: "A mensagem será registrada em mensagens_ativas quando o webhook do Whapi receber o evento from_me=true."

Com o webhook ignorando `from_me`, as mensagens de saída simplesmente desaparecem do banco.

### Correção: inserir na origem

Duas fontes de envio precisam inserir em `mensagens_ativas` após envio bem-sucedido:

#### 1. `supabase/functions/start-conversation/index.ts`

Após a linha 150 (envio bem-sucedido via Whapi), inserir a mensagem em `mensagens_ativas`:

```typescript
await supabase.from('mensagens_ativas').insert({
  empresa_id,
  conversa_id: conversaId,
  contato_id,
  direcao: 'out',
  tipo_remetente: remetente_id ? 'agente' : 'sistema',
  remetente_id: remetente_id || null,
  conteudo: messageText,
})
```

#### 2. `src/hooks/useMensagens.ts` — `useEnviarMensagem`

Após o envio bem-sucedido via `whapi-send-message`, inserir a mensagem diretamente no banco via Supabase client:

```typescript
await supabase.from('mensagens_ativas').insert({
  empresa_id: empresaId,
  conversa_id: conversaId,
  contato_id: contato_id,
  direcao: 'out',
  tipo_remetente: 'agente',
  remetente_id: remetenteId,
  conteudo: conteudo,
})
```

### Impacto

- Mensagens do agente voltam a aparecer imediatamente
- Sem risco de duplicação (webhook continua ignorando `from_me`)
- Nenhuma alteração de schema necessária

