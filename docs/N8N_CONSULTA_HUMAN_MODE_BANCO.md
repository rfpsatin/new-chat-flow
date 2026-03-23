# n8n: consulta human_mode no banco quando Redis não tem valor

Objetivo: quando o Redis não tiver informação válida (TTL expirado ou primeira mensagem), o fluxo consulta a Edge Function `conversation-attendance-status`, que lê no banco se a conversa ativa está em modo humano. O resultado alimenta o Redis e segue no fluxo, evitando que o bot volte a responder após timeout do Redis.

---

## 1. Edge Function (já criada no projeto)

**Nome:** `conversation-attendance-status`  
**Caminho:** `supabase/functions/conversation-attendance-status/index.ts`

### 1.1 O que faz

- Recebe `empresa_id` e `numero` (WhatsApp, só dígitos).
- Busca contato em `contatos` (empresa_id + número).
- Busca última conversa **não encerrada** em `conversas` para esse contato.
- Retorna:
  - `human_mode`: `true` se `conversas.human_mode === true` ou `origem_final === 'atendente'`, senão `false`.
  - `status`: ex.: `bot`, `esperando_tria`, `em_atendimento_humano`.
  - `conversa_id`: id da conversa ativa ou `null`.
  - `reason`: `no_contact` | `no_active_conversation` | `active_conversation`.

### 1.2 Chamada

- **Método:** GET ou POST.
- **Segurança:** header `x-webhook-secret` com o mesmo valor de `WHAPI_WEBHOOK_SECRET` (opcional; se a env existir, a função exige o header).
- **GET:**  
  `https://hyizldxjiwjeruxqrqbv.supabase.co/functions/v1/conversation-attendance-status?empresa_id={{ empresa_id }}&numero={{ numero_redis }}`
- **POST:**  
  Body: `{ "empresa_id": "...", "numero": "5544999999999" }`  
  Header: `Content-Type: application/json` (e `x-webhook-secret` se configurado).

### 1.3 Exemplo de resposta

```json
{
  "human_mode": true,
  "status": "em_atendimento_humano",
  "conversa_id": "uuid-da-conversa",
  "reason": "active_conversation"
}
```

Quando não há contato ou conversa ativa:

```json
{
  "human_mode": false,
  "status": null,
  "conversa_id": null,
  "reason": "no_active_conversation"
}
```

---

## 2. Onde mexer no fluxo n8n (Versão 0.2 - Agente Mkt-17)

O fluxo WhatsApp hoje:

1. **Code** → **Recompoe texto** (merge) e **Redis Get**
2. **Redis Get** → **Parse** (extrai `human_mode_redis` e `empresa_id` do state)
3. **Parse** → **Recompoe texto** (merge)
4. **Recompoe texto** → **Tem id da empresa?** e **Recompoe texto4**
5. **Tem id da empresa?** (não) → **Buscar dados da empresa1** → **Recompoe texto4**
6. **Recompoe texto4** → **Compara human_mode**
7. **Compara human_mode** → **Atualiza** (e Redis Set) ou **human_mode?**

A alteração fica **entre “Recompoe texto4” e “Compara human_mode”**: quando o Redis não tiver `human_mode_redis` válido, consultar a Edge Function, atualizar o Redis com o retorno e usar esse valor no resto do fluxo.

---

## 3. Passo a passo no editor n8n

### 3.1 Inserir nó IF após “Recompoe texto4”

- **Nome sugerido:** `Redis tem human_mode?`
- **Tipo:** IF (Condition).
- **Condição:**
  - Campo: valor da expressão (Expression).
  - Valor (Expression):
    ```text
    {{ ($json.human_mode_redis !== null && $json.human_mode_redis !== undefined && $json.human_mode_redis !== '') === true }}
    ```
  - Ou em formato “Boolean – is true”: left value = a expressão acima, operador “is true”.
- **Conexões:**
  - **TRUE (Redis tem valor)** → seguir para um novo nó **Merge** (entrada 1).
  - **FALSE (Redis vazio/expirado)** → seguir para o novo HTTP Request (ver abaixo).

### 3.2 Inserir HTTP Request (consulta ao banco)

- **Nome sugerido:** `HTTP - Attendance status (banco)`
- **Tipo:** HTTP Request.
- **Método:** GET.
- **URL:**
  ```text
  https://hyizldxjiwjeruxqrqbv.supabase.co/functions/v1/conversation-attendance-status?empresa_id={{ $json.empresa_id }}&numero={{ $json.numero_redis }}
  ```
- **Headers (se usar secret):**
  - `x-webhook-secret`: valor do seu `WHAPI_WEBHOOK_SECRET`.
- **Options:** timeout sugerido 5–10 s.

Saída: um item com o JSON da função (`human_mode`, `status`, `conversa_id`, `reason`). O próximo nó precisa repassar os campos do item anterior (Recompoe texto4) e sobrescrever `human_mode_redis` com o valor do banco.

### 3.3 Inserir nó Code (mapear resposta → human_mode_redis)

- **Nome sugerido:** `Mapear human_mode do banco`
- **Tipo:** Code.
- **Objetivo:** o HTTP Request devolve o body da Edge Function; o merge do fluxo precisa do mesmo “shape” do item que veio de “Recompoe texto4”, com `human_mode_redis` preenchido pelo retorno da função.
- **Modo:** “Run Once for All Items” ou “Run Once for Each Item” (conforme você passar 1 item).
- **Código sugerido (para 1 item do HTTP):**
  ```javascript
  const response = $input.first().json;
  const human_mode_from_db = response.human_mode === true;

  // O item anterior (Recompoe texto4) tinha todos os campos do fluxo; o HTTP substitui o item.
  // Se o n8n tiver passado só o body do HTTP, precisamos do item anterior no Merge.
  // Alternativa: no HTTP Request, em "Options", usar "Response" → "Full Response" e acessar
  // o item anterior de outra forma. Mais simples: no Code, receber o item do HTTP e assumir
  // que no próximo Merge vamos juntar com o branch que tem o item completo.

  return [{ json: {
    ...($json.conversa_id !== undefined ? $json : {}),
    human_mode_redis: human_mode_from_db,
    human_mode_from_db: human_mode_from_db,
    attendance_status: response.status,
    attendance_conversa_id: response.conversa_id,
    attendance_reason: response.reason
  } }];
  ```
  Como o HTTP Request substitui o item pelo body, no Code você tem só o body. Então o ideal é **não** depender dos campos do Recompoe texto4 dentro deste branch; em vez disso, no **Merge** você combina:
  - Branch 1 (Redis tem valor): item que saiu de “Recompoe texto4” e já tem `human_mode_redis`.
  - Branch 2 (veio do HTTP + Code): aqui você precisa do item **completo** do fluxo mais o novo `human_mode_redis`.

Para o branch 2 ter o item completo, duas opções:

**Opção A – Merge por posição (recomendado)**  
- Fazer o **Redis tem human_mode?** (FALSE) ir para o HTTP Request.  
- O HTTP Request não preserva o item anterior. Então antes do HTTP Request, usar um **Merge** de dois inputs: um vem de “Recompoe texto4” (só pelo branch FALSE), e o outro seria o mesmo item. Isso duplica.  
- Melhor: **Clone do item** antes do IF. Assim:
  1. **Recompoe texto4** → **Clone item** (opcional) → **Redis tem human_mode?**
  2. FALSE → **HTTP - Attendance status** → **Code (Mapear human_mode do banco)**. No Code, você precisa receber **também** os campos do item que estava em “Recompoe texto4”. Para isso, no n8n você pode usar um **Merge** “Combine by position” **antes** do HTTP: Input 1 = item de Recompoe texto4 (só pelo branch FALSE), Input 2 = vazio; depois o HTTP Request usa apenas empresa_id e numero_redis do Input 1 e substitui o item. Aí perdemos o resto do item.  
- Solução mais simples: **no branch FALSE, não fazer Merge antes do HTTP**. Fazer:
  1. **Recompoe texto4** → **Redis tem human_mode?**
  2. FALSE → **HTTP Request** (usa `$json.empresa_id` e `$json.numero_redis` do item atual; nesse ponto o item ainda é o de Recompoe texto4).
  3. No n8n, ao colocar dois nós em sequência (Recompoe texto4 → IF → HTTP), o item que chega no HTTP no branch FALSE **é** o item de Recompoe texto4. O nó HTTP Request por padrão **substitui** o item pelo body da resposta. Então perdemos empresa_id, numero_redis, etc.
  4. Para manter: no HTTP Request, em **Options**, procurar “Response” / “Put Output in Field” e colocar a resposta em um campo, por exemplo `attendance_response`. Assim o item mantém todos os campos e ganha `attendance_response` com o body. Aí no Code você faz `human_mode_redis = $json.attendance_response.human_mode` e passa adiante.
  5. Ou: usar dois nós – um **Set** que guarda o item em um campo (ex.: `_previous`), depois HTTP, depois **Code** que lê `_previous` e `attendance_response` e monta o item com `human_mode_redis` do banco.

Fluxo mais simples sem “Set” extra:

- **Redis tem human_mode?** (FALSE) → **HTTP Request**.
- No HTTP Request: **Options** → **Response** → “Put Output in Field” = `attendance_response` (ou outro nome).
- Assim o item que sai do HTTP tem: todos os campos do item que entrou (Recompoe texto4) **mais** `attendance_response` = body da Edge Function.
- **Code** (após HTTP):
  ```javascript
  const r = $json.attendance_response || {};
  const human_mode_redis = r.human_mode === true;
  return [{
    json: {
      ...$json,
      human_mode_redis,
      attendance_status: r.status,
      attendance_reason: r.reason
    }
  }];
  ```
- Saída do Code → **Redis Set** (atualizar state com esse `human_mode_redis`) → **Merge** (entrada 2).

### 3.4 Configurar o HTTP Request para manter o item

- No nó **HTTP - Attendance status (banco)**:
  - **Options** (ou “Settings”) → **Response** → **Put Output in Field**: `attendance_response`.
- Assim a resposta da Edge Function fica em `$json.attendance_response` e o restante do item (incluindo `empresa_id`, `numero_redis`, etc.) é preservado.

### 3.5 Code após o HTTP

- **Nome:** `Mapear human_mode do banco`
- **Código:**
  ```javascript
  const r = $json.attendance_response || {};
  const human_mode_redis = r.human_mode === true;
  return [{
    json: {
      ...$json,
      human_mode_redis,
      attendance_status: r.status,
      attendance_reason: r.reason
    }
  }];
  ```
- Saída → **Redis Set** (ver 3.6) → **Merge** (entrada 2).

### 3.6 Redis Set (atualizar cache quando veio do banco)

- **Nome sugerido:** `Redis Set (do banco)`
- **Tipo:** Redis – Set.
- **Key:** `state:{{ $json.numero_redis }}`
- **Value:**
  ```text
  {{ JSON.stringify({ human_mode_redis: $json.human_mode_redis, empresa_id: $json.empresa_id }) }}
  ```
- **TTL:** 600 (10 minutos), igual ao outro Redis Set.
- Entrada: saída do Code “Mapear human_mode do banco”.
- Saída → **Merge** (entrada 2).

### 3.7 Merge e ligação para “Compara human_mode”

- **Nome sugerido:** `Merge human_mode`
- **Tipo:** Merge.
- **Mode:** Combine by position.
- **Input 1:** saída de **Redis tem human_mode?** (TRUE) – item de Recompoe texto4 já com `human_mode_redis` preenchido.
- **Input 2:** saída de **Redis Set (do banco)** – item que foi consultado no banco, passou pelo Code e foi atualizado no Redis.
- **Saída do Merge** → **Compara human_mode** (substituir a conexão que hoje vem de “Recompoe texto4”).

Conexões a ajustar:

- **Recompoe texto4** → deixar de conectar direto em **Compara human_mode**.
- **Recompoe texto4** → **Redis tem human_mode?**
- **Redis tem human_mode?** (TRUE) → **Merge human_mode** (input 1).
- **Redis tem human_mode?** (FALSE) → **HTTP - Attendance status (banco)** → **Mapear human_mode do banco** → **Redis Set (do banco)** → **Merge human_mode** (input 2).
- **Merge human_mode** → **Compara human_mode**.

---

## 4. Resumo do fluxo alterado

```
Recompoe texto4
    → Redis tem human_mode?
        ├─ TRUE  → Merge human_mode (input 1) ──────────────────┐
        └─ FALSE → HTTP - Attendance status (banco)            │
                    → Mapear human_mode do banco                │
                    → Redis Set (do banco)                      │
                    → Merge human_mode (input 2) ───────────────┤
                                                               ▼
                                              Merge human_mode → Compara human_mode → …
```

Enquanto o Redis tiver valor válido, nada é consultado no banco. Quando não tiver (TTL expirado ou primeira vez), a consulta à Edge Function preenche `human_mode_redis` a partir do banco e atualiza o Redis para os próximos 10 minutos.

---

## 5. Variáveis de ambiente (Supabase)

- Na Edge Function, a checagem de segurança usa `WHAPI_WEBHOOK_SECRET`. Configure essa variável no projeto Supabase (igual à do whapi-webhook). No n8n, no HTTP Request, adicione o header `x-webhook-secret` com o mesmo valor.

---

## 6. Deploy da Edge Function

```bash
supabase functions deploy conversation-attendance-status --project-ref hyizldxjiwjeruxqrqbv
```

Ou pelo painel do Supabase / Lovable, fazendo deploy da função `conversation-attendance-status`.
