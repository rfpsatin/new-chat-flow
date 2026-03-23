# Planejamento: Centralizar mensagens do chat web no Hub (chat-flow-pro)

Objetivo: fazer com que as mensagens enviadas pelo **chat web** (projeto bot-web) também entrem na aplicação de mensageria (chat-flow-pro), no mesmo estilo do WhatsApp, para centralizar tudo no Hub.

**Regra:** nenhuma alteração de código neste documento — apenas orquestração e recomendações.

---

## 1. Como o WhatsApp entra no Hub hoje (whapi-webhook)

- **URL:** `https://hyizldxjiwjeruxqrqbv.supabase.co/functions/v1/whapi-webhook?empresa_id=...`
- **Quem chama:** Whapi (provedor WhatsApp), quando chega mensagem no número conectado.
- **Payload:** corpo no formato Whapi (ex.: `event.messages[]` ou `messages[]`), com:
  - `from` (número WhatsApp do cliente, ex. `5511999999999@s.whatsapp.net`)
  - `from_me` (true = mensagem enviada pelo bot/número da empresa)
  - `from_name`, `chat_id`, `timestamp`, `type`, `text.body`, etc.
- **Fluxo no Hub:**
  1. Valida `empresa_id` (query) e existe em `empresas`.
  2. Para cada mensagem:
     - **Contato:** `findOrCreateContato(empresa_id, whatsapp_numero, nome)` — chave é `(empresa_id, whatsapp_numero)` na tabela `contatos` (único).
     - **Conversa:** `findOrCreateConversa(empresa_id, contato_id, conteudo)` — busca última conversa do contato; se encerrada ou não existir, cria nova com `status: 'esperando_tria'`, `canal: 'whatsapp'`.
     - **Mensagem:** insert em `mensagens_ativas` com `direcao` in/out, `tipo_remetente` cliente/bot, `conteudo`, `payload` (raw).
  3. Atualiza `conversas.last_message_at`.

- **Ponto importante:** no Hub o “identificador estável” do cliente é o **número de WhatsApp** (`whatsapp_numero` em `contatos`). Não existe hoje conceito de “contato só de web”.

---

## 2. Como o chat web funciona hoje (bot-web)

- **Projeto:** `bot-web/cine-support-hub` (React + ChatWidget).
- **Fluxo atual:**
  - Usuário escolhe canal (Marketing / Comercial), digita e envia.
  - Front gera ou recupera `sessionId` (ex.: `webchat-${Date.now()}`) no `localStorage`.
  - **Única chamada externa:** `POST` para **n8n** (`API_ENDPOINTS.n8n.whatsappCinemkt`), corpo:
    - `to`: sessionId
    - `body`: texto da mensagem
    - `source`: `"web-chat"`
    - `channel`: `"mkt"` ou `"comercial"`
  - Resposta do n8n é exibida como resposta do bot no chat; mensagens ficam só em estado local + `localStorage`. **Nenhuma chamada vai para o Supabase/Hub.**

- **Consequência:** o Hub não recebe nada do chat web; não há contato nem conversa “web” no banco do Hub.

---

## 3. O que precisamos para “igual ao WhatsApp”

Para o Hub tratar o web chat de forma parecida com o WhatsApp, precisamos:

1. **Identificador estável do “cliente” na web**  
   No WhatsApp é o número; na web pode ser o `sessionId` (ex.: `webchat-1771266325740`) ou um ID anônimo persistido no navegador. Esse identificador precisa ser usado sempre no mesmo contexto (mesma empresa) para encontrar o mesmo contato/conversa.

2. **Cada mensagem do usuário (web) virar um evento no Hub**  
   Com: empresa, identificador do cliente (ex. session_id), canal (mkt/comercial), texto, timestamp. O Hub então:
   - encontra ou cria um **contato** associado a esse identificador (web),
   - encontra ou cria uma **conversa** para esse contato (ex. `canal: 'web'`),
   - insere em **mensagens_ativas** como entrada do cliente (`direcao: 'in'`, `tipo_remetente: 'cliente'`).

3. **Opcional mas útil:** também registrar as **respostas do bot** no Hub (`direcao: 'out'`, `tipo_remetente: 'bot'`), para o histórico da conversa ficar completo no painel.

4. **Compatibilidade com o modelo atual do Hub**  
   - Tabela `contatos` hoje tem `whatsapp_numero` NOT NULL e UNIQUE(empresa_id, whatsapp_numero). Para web não temos número; precisamos de uma estratégia (sintético ou novo campo) — ver opções abaixo.
   - `conversas` já tem `canal` (ex.: `'whatsapp'`); podemos usar `canal: 'web'` para conversas do chat web. Já existem também `source`, `channel`, `n8n_webhook_id` em `conversas` (migration n8n cinemkt), o que ajuda a diferenciar origem/canal sem mudar necessariamente o modelo de contato.

---

## 4. Estratégia para “contato” web (sem número)

- **Opção A – Número sintético no mesmo campo**  
  Usar `whatsapp_numero` com um valor convencional para web, ex.: `web-{sessionId}` (ex.: `web-webchat-1771266325740`).  
  - Prós: nenhuma alteração de schema; mesma lógica de findOrCreate por “número”.  
  - Contras: o campo deixa de ser “só WhatsApp”; relatórios/filtros que assumem “número = telefone” precisam considerar esse prefixo.

- **Opção B – Novo campo em contatos**  
  Ex.: `web_session_id` (ou `external_id`) nullable, UNIQUE(empresa_id, web_session_id). FindOrCreate por `web_session_id` quando origem for web; `whatsapp_numero` poderia ser nullable ou um valor dummy.  
  - Prós: separação clara WhatsApp vs web.  
  - Contras: exige migration e ajuste em toda lógica de “find contato” (whapi continua por whatsapp_numero; web por web_session_id).

- **Recomendação para MVP:** Opção A (número sintético), para não alterar schema e reutilizar ao máximo a lógica atual do whapi-webhook. Podemos migrar para B depois se quiser relatórios mais limpos por tipo de canal.

---

## 5. Onde implementar o “hook” (quem envia para o Hub)

Três cenários possíveis:

### 5.1. Hook no próprio bot-web (front)

- No `handleSendMessage` do ChatWidget, **além** (ou em vez de apenas) da chamada ao n8n, fazer um `POST` para uma Edge Function do Hub (ex.: `webchat-webhook` ou um endpoint unificado).
- Payload mínimo: `empresa_id`, `session_id`, `channel` (mkt/comercial), `content` (texto), `direction: 'in'`, opcionalmente `request_id`.
- Quando o n8n responder, o front pode fazer um segundo POST com a resposta do bot (`direction: 'out'`, `tipo_remetente: 'bot'`) para o mesmo `session_id`/conversa.
- Prós: controle total no front; não depende do n8n. Contras: duas (ou mais) chamadas por mensagem (n8n + Hub); CORS e auth precisam estar corretos para o domínio do bot-web chamar o Supabase.

### 5.2. Hook no n8n (middleware)

- Bot-web continua enviando só para o n8n. O fluxo do n8n, após receber a mensagem do web, chama o Hub (mesma URL de webhook que definirmos) com um payload normalizado (empresa_id, session_id, channel, content, direction).
- Quando o n8n gera a resposta do bot, outro passo no fluxo chama o Hub de novo com a mensagem “out” do bot.
- Prós: bot-web não muda; toda lógica de “quando enviar para o Hub” fica no n8n. Contras: depende da configuração e manutenção do n8n; precisa definir contrato claro (payload e quando chamar).

### 5.3. Híbrido

- Front envia apenas “mensagem do usuário” para o Hub (para garantir que a entrada do cliente sempre apareça).
- Respostas do bot podem vir do n8n (n8n chama o Hub com a resposta) ou do front (após receber a resposta do n8n, o front chama o Hub). Escolha por onde for mais simples operacionalmente.

Recomendação: **para orquestrar sem mexer em código ainda**, definir primeiro **um único contrato de payload** que o Hub aceita (ex.: Edge Function `webchat-webhook`). Tanto o bot-web quanto o n8n podem chamar esse mesmo endpoint; a decisão “só front”, “só n8n” ou “híbrido” pode ser feita em seguida com base em quem fica mais fácil manter (CORS, secrets, número de chamadas).

---

## 6. Contrato sugerido para o webhook “webchat” no Hub

Objetivo: mesmo “estilo” do Whapi (um endpoint que recebe eventos e grava contato + conversa + mensagem), mas com payload explícito e simples para web.

- **Método:** POST.
- **URL (exemplo):** `https://<supabase>/functions/v1/webchat-webhook?empresa_id=<uuid>`  
  (ou sem empresa_id no path e sim no body; o importante é validar empresa.)
- **Headers:** `Content-Type: application/json`. Autenticação: conforme política do projeto (ex.: API key de serviço ou Bearer do Supabase).
- **Body (mínimo):**
  - `empresa_id` (uuid) — obrigatório se não vier na query.
  - `session_id` (string) — identificador estável do visitante (ex.: `webchat-1771266325740`). Será usado para findOrCreate contato (ex.: como número sintético `web-{session_id}`).
  - `channel` (string, opcional) — ex.: `mkt`, `comercial` (já existe em `conversas.channel`).
  - `messages` (array) — para compatibilidade com “estilo whapi”, ou um único objeto para uma mensagem:
    - `id` (string, opcional)
    - `from_me` (boolean) — false = cliente, true = bot
    - `content` ou `text` (string) — corpo da mensagem
    - `timestamp` (opcional, ISO ou número)
  - Ou, em formato mais simples, um único objeto: `{ session_id, channel, from_me, content }` e a função insere uma mensagem por vez.
- **Comportamento esperado da função (resumo):**
  1. Validar `empresa_id` e existência em `empresas`.
  2. Resolver contato: por `(empresa_id, whatsapp_numero)` com `whatsapp_numero = 'web-' + session_id` (ou por `web_session_id` se for adotada Opção B).
  3. Para cada mensagem: findOrCreate conversa (por contato; status inicial ex.: `esperando_tria`; `canal: 'web'`); insert em `mensagens_ativas` com `direcao`/`tipo_remetente` conforme `from_me`; atualizar `last_message_at`.
  4. Retornar 200 com `{ success: true, processed: N }` (e opcionalmente conversa_id, contato_id para debug).

Assim, o “hook” no bot-web (ou no n8n) só precisa montar esse JSON e fazer POST; o Hub centraliza igual ao WhatsApp.

---

## 7. Resumo e próximos passos (sem código)

| Item | Situação |
|------|----------|
| WhatsApp | Entra no Hub via `whapi-webhook`; contato por `whatsapp_numero`; conversa por contato; mensagens em `mensagens_ativas`. |
| Chat web | Hoje só fala com n8n; nada é enviado ao Hub. |
| Objetivo | Mensagens do chat web também aparecerem no Hub (mesmo “estilo” que WhatsApp). |
| Contato web | Usar identificador estável (ex.: session_id). No Hub: contato por número sintético `web-{session_id}` (Opção A) ou por futuro campo `web_session_id` (Opção B). |
| Canal | `conversas.canal = 'web'`; `source`/`channel` já existem para refinamento. |
| Quem chama o Hub | Decidir: só bot-web (front), só n8n, ou híbrido. Recomendação: definir um único endpoint `webchat-webhook` e depois escolher quem o chama. |
| Próximo passo | 1) Confirmar estratégia de contato (A ou B). 2) Especificar o contrato final do body (um evento por request ou array de mensagens). 3) Implementar a Edge Function no Hub. 4) Implementar no bot-web (ou n8n) a chamada a esse endpoint na hora do envio (e opcionalmente ao receber resposta do bot). |

Assim você consegue ter um hook implementado no projeto do chat web (ou no n8n) que gera as informações de comunicação dentro do Hub, no mesmo estilo do WhatsApp, com tudo orquestrado antes de mudar código.
