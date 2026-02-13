
# Exibir mensagens do bot no webhook

## Problema
O webhook (`whapi-webhook`) atualmente:
1. Rejeita requisicoes PUT (so aceita POST) - linha 49
2. Sempre insere mensagens como `direcao: 'in'` e `tipo_remetente: 'cliente'` - linhas 167-168
3. Para mensagens do bot, nao deve criar novas conversas nem disparar logica de handoff humano

## Alteracoes em `supabase/functions/whapi-webhook/index.ts`

### 1. Aceitar metodo PUT alem de POST
Alterar a validacao de metodo (linha 49) para aceitar tanto POST quanto PUT.

### 2. Detectar mensagens do bot via `from_me`
As mensagens enviadas pelo bot/canal vem com `from_me: true` no payload do Whapi. Usar esse campo para determinar:
- `from_me: true` → `direcao: 'out'`, `tipo_remetente: 'bot'`
- `from_me: false` → `direcao: 'in'`, `tipo_remetente: 'cliente'` (comportamento atual)

### 3. Pular logica de criacao de conversa e handoff para mensagens do bot
Para mensagens com `from_me: true`:
- Buscar a conversa ativa pelo `chat_id` (numero do contato destinatario), mas NAO criar nova conversa se nao existir
- NAO disparar a logica de deteccao de "Falar com atendente humano"
- NAO atualizar nome do contato
- Se nao encontrar conversa ativa, ignorar a mensagem (o bot pode estar respondendo a conversas que nao estao no sistema)

### 4. Extrair numero do contato corretamente para mensagens do bot
Para mensagens `from_me: true`, o campo `from` contem o numero do canal (nao do contato). O numero do contato esta no campo `chat_id`. Usar `chat_id` (removendo @s.whatsapp.net) para identificar o contato.

### Secao tecnica

Adicionar `from_me?: boolean` na interface `WhapiMessage`.

No loop de processamento de mensagens:
```text
const isFromBot = message.from_me === true
const whatsappNumero = isFromBot
  ? message.chat_id.replace('@s.whatsapp.net', '').replace('@c.us', '')
  : message.from.replace('@s.whatsapp.net', '').replace('@c.us', '')
```

Na insercao da mensagem:
```text
direcao: isFromBot ? 'out' : 'in',
tipo_remetente: isFromBot ? 'bot' : 'cliente',
```

Pular blocos de handoff e criacao de conversa quando `isFromBot` for true. Se a conversa nao existir para uma mensagem do bot, logar e pular sem erro.
