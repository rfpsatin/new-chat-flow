# Análise das Edge Functions n8n e sugestão de uso para o chat web

## 1. O que cada Edge Function já faz

### n8n-webhook-cinemkt

- **Objetivo:** receber payloads do fluxo n8n (whatsapp_cinemkt) e **centralizar no Hub** a mensagem do usuário e, opcionalmente, a resposta do bot.
- **Payload aceito:**
  - `to` (obrigatório) — usado como identificador da sessão (ex.: `webchat-1771266325740`). No Hub vira `n8n_webhook_id` na conversa e **`whatsapp_numero` no contato** (número sintético para web).
  - `body` (obrigatório) — texto da mensagem do usuário.
  - `source` (opcional) — ex.: `"web-chat"`.
  - `channel` (opcional) — ex.: `"mkt"`, `"comercial"`.
  - `human_mode` (opcional) — se `true` e conversa em `bot`, atualiza para `esperando_tria`.
  - `resposta` (opcional) — texto da resposta do bot; se enviado, grava também em `mensagens_ativas` (out, bot).

**Fluxo interno:**
1. Resolve empresa (hoje: primeira empresa ativa — auto-detect).
2. **Contato:** findOrCreate por `(empresa_id, whatsapp_numero)` com `whatsapp_numero = to` (ou seja, o `to` é o identificador estável do visitante).
3. **Conversa:** findOrCreate por contato (ativa, não encerrada); atualiza ou preenche `source`, `channel`, `human_mode`, `n8n_webhook_id`. Nova conversa é criada com `status: 'bot'`, `canal: 'whatsapp'`, `iniciado_por: 'cliente'`.
4. Insere mensagem do usuário em `mensagens_ativas` (direcao `in`, tipo_remetente `cliente`).
5. Se veio `resposta`, insere mensagem do bot (direcao `out`, tipo_remetente `bot`).
6. Atualiza `last_message_at` da conversa.
7. Se `human_mode === true` e status era `bot`, faz update para `esperando_tria`.

Ou seja: **essa função já implementa exatamente o “hook” que centraliza mensagens de web no Hub** (contato por session id, conversa, mensagem in + opcional out).

### n8n-reset-human-mode

- **Objetivo:** quando alguém no Hub “reseta” o modo humano de uma conversa que veio do n8n, avisar o n8n para alinhar estado.
- **Input:** `conversa_id`, `empresa_id` (body JSON).
- **Comportamento:** busca a conversa; se tiver `n8n_webhook_id` (e/ou source/channel), faz POST para o webhook do n8n (`whatsapp_cinemkt`) com:
  - Campos raiz: `{ action: 'reset_human_mode', to: n8n_webhook_id, conversa_id }`;
  - **Novo contrato:** inclui também `messages[0].human_mode` com o valor booleano vindo de `conversas.human_mode`, além de metadados úteis (`conversa_id`, `origem`, `channel`), por exemplo:
    - `messages: [{ human_mode: true|false, conversa_id, origem, channel }]`.
- **Uso:** sincronizar Hub → n8n (não cria mensagens; é só sinal para o n8n limpar `human_mode` no fluxo).

---

## 2. Comparação com a proposta anterior (webchat-webhook)

A proposta era: um endpoint no Hub que recebesse mensagens do chat web (session_id, channel, conteúdo, in/out) e gravasse contato + conversa + mensagens.

O **n8n-webhook-cinemkt já cobre isso**:

- O `to` do payload é o session id (equivalente ao `session_id`).
- `body` = mensagem do usuário; `resposta` = mensagem do bot.
- `source` e `channel` já são persistidos na conversa.
- Contato é findOrCreate por `to` em `whatsapp_numero` (abordagem de “número sintético” que tínhamos sugerido).

Conclusão: **não é necessário criar uma nova Edge Function “webchat-webhook”**. Basta usar e orquestrar a **n8n-webhook-cinemkt** como ponto único de entrada no Hub para o fluxo n8n (incluindo web).

---

## 3. Onde está o “gap” hoje

- **Bot-web:** envia só para o n8n (`to`, `body`, `source`, `channel`). **Não chama o Hub.**
- **N8n:** recebe do bot-web, processa e devolve a resposta ao bot-web. **Hoje não chama o Hub** (n8n-webhook-cinemkt).

Ou seja: o gap é **quem chama** a n8n-webhook-cinemkt e **quando**, não a falta de função.

---

## 4. Melhor forma de seguir (recomendação)

### Opção recomendada: n8n chama o Hub (n8n-webhook-cinemkt)

- **Bot-web:** continua igual: um único POST para o n8n com `to`, `body`, `source`, `channel` (e, se tiver, `human_mode` quando o usuário escolher atendimento humano).
- **Fluxo n8n:** após receber a mensagem do web e **depois de obter a resposta do bot**:
  1. Fazer um **único** POST para a Edge Function **n8n-webhook-cinemkt** do Hub com:
     - `to`: mesmo session id recebido do bot-web
     - `body`: mensagem do usuário
     - `source`: `"web-chat"`
     - `channel`: `"mkt"` ou `"comercial"`
     - `human_mode`: `true`/`false` conforme lógica do fluxo (ex.: quando o usuário pede humano)
     - `resposta`: texto da resposta do bot
  Assim o Hub grava numa única chamada a mensagem do cliente e a do bot, sem duplicar usuário e sem precisar de segundo endpoint.

- **Vantagens:**
  - Nenhuma alteração no bot-web (sem CORS, sem segunda chamada no front).
  - Uma única Edge Function no Hub para esse fluxo.
  - Contrato já existente e implementado.
  - n8n já tem o contexto (to, body, source, channel, resposta); só falta o passo “HTTP Request → n8n-webhook-cinemkt”.

### Alternativa: bot-web chama o Hub diretamente

- Bot-web faria POST para a URL da n8n-webhook-cinemkt **antes** de chamar o n8n (só mensagem do usuário: `to`, `body`, `source`, `channel`).
- Quando o n8n devolver a resposta, o bot-web faria **outro** POST para o Hub. Aí surgem duas opções:
  - Reutilizar o mesmo endpoint com `body` = mesma mensagem do usuário e `resposta` = resposta do bot (evita criar “só bot” no Hub, mas envia a mensagem do usuário duas vezes no segundo POST).
  - Ou criar um endpoint extra “só resposta do bot” (ex.: recebe `to` + `resposta`, localiza conversa por `n8n_webhook_id`, insere só a mensagem out). Aumenta superfície de código e manutenção.

Por isso a **recomendação é centralizar a chamada no n8n** e manter o bot-web apenas falando com o n8n.

---

## 5. Ajustes sugeridos no código existente (opcionais mas úteis)

1. **Canal da conversa para web**  
   Em `findOrCreateConversa`, ao criar conversa **nova**, usar `canal: 'web'` quando `source === 'web-chat'` (em vez de sempre `'whatsapp'`). Assim relatórios e filtros por canal continuam corretos.

2. **Empresa**  
   Hoje a função usa “primeira empresa ativa”. Se no futuro houver múltiplas empresas, aceitar `empresa_id` na query (ex.: `?empresa_id=...`) como no whapi-webhook, e só fazer auto-detect quando não vier.

3. **n8n-reset-human-mode**  
   Manter como está: já atende ao caso “Hub reseta human mode e avisa o n8n”.

---

## 6. Resumo

| Pergunta | Resposta |
|----------|----------|
| Precisamos de nova Edge Function para o chat web? | **Não.** Usar **n8n-webhook-cinemkt**. |
| Quem deve chamar o Hub? | **N8n**, após gerar a resposta do bot, com um POST contendo `to`, `body`, `source`, `channel`, `human_mode` (se aplicável) e `resposta`. |
| Precisamos mudar o bot-web? | **Não**, se o n8n passar a chamar o Hub. O bot-web continua enviando só para o n8n. |
| O que falta fazer? | No **n8n**: adicionar passo no workflow que chama a URL da Edge Function **n8n-webhook-cinemkt** com o payload acima. No **Hub**: opcionalmente ajustar criação de conversa para `canal: 'web'` quando `source === 'web-chat'`. |

Com isso, a solução fica alinhada ao código já criado (n8n-webhook-cinemkt e n8n-reset-human-mode) e a melhor forma de seguir é orquestrar o fluxo no n8n em vez de duplicar lógica no front ou criar novo endpoint.
