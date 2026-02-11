

## Plano: Redirecionar conversas para Bot + Integrar attendanceMode via n8n

### Resumo

Tres mudancas principais:
1. Conversas criadas pelo webhook vao para status `bot` (ao inves de `esperando_tria`)
2. Nova edge function `check-attendance-mode` que verifica no n8n/Redis se o usuario pediu atendente humano
3. Nova edge function `close-service` chamada ao encerrar atendimento, atualizando attendanceMode para `automated`

---

### 1. Alterar `whapi-webhook` - Status inicial para `bot`

No arquivo `supabase/functions/whapi-webhook/index.ts`, trocar todas as ocorrencias de `status: 'esperando_tria'` para `status: 'bot'` na funcao `findOrCreateConversa()`. Sao 2 pontos (linhas 365 e 394).

Alem disso, apos inserir a mensagem, verificar se o conteudo contem "Falar com o atendente humano" (ou variacao). Se sim, chamar a edge function `check-attendance-mode` para consultar o n8n.

---

### 2. Nova Edge Function: `check-attendance-mode`

Arquivo: `supabase/functions/check-attendance-mode/index.ts`

Responsabilidade:
- Receber `conversa_id` e `empresa_id`
- Fazer GET em `http://162.240.152.122/workflow/YKu4UqLlWMoZ4dUk` para consultar o attendanceMode
- Se retornar `human`: atualizar a conversa para status `esperando_tria`
- Se retornar `automated`: nao fazer nada

Configuracao em `supabase/config.toml`:
```toml
[functions.check-attendance-mode]
verify_jwt = false
```

---

### 3. Nova Edge Function: `close-service`

Arquivo: `supabase/functions/close-service/index.ts`

Responsabilidade:
- Receber `conversa_id` e `empresa_id`
- Fazer POST em `http://162.240.152.122/workflow/YKu4UqLlWMoZ4dUk` com `{ attendanceMode: "automated" }` para atualizar no Redis
- Retornar sucesso/erro

Configuracao em `supabase/config.toml`:
```toml
[functions.close-service]
verify_jwt = false
```

---

### 4. Integrar `close-service` no fluxo de encerramento

No arquivo `src/hooks/useEncerramento.ts`, adicionar chamada a edge function `close-service` antes ou apos o encerramento da conversa (passo 5 atual). A chamada sera feita via fetch, similar ao envio da pesquisa.

---

### 5. Integrar deteccao de "Falar com o atendente humano" no webhook

No webhook, apos inserir a mensagem com sucesso, verificar se a conversa esta com status `bot` e se o conteudo da mensagem contem a frase "Falar com o atendente humano" (case-insensitive). Se sim, chamar internamente a logica de check-attendance-mode (consultar n8n e atualizar status se necessario).

---

### Arquivos a criar/modificar

| Arquivo | Acao |
|---------|------|
| `supabase/functions/whapi-webhook/index.ts` | Trocar `esperando_tria` por `bot` + adicionar deteccao de frase |
| `supabase/functions/check-attendance-mode/index.ts` | **Criar** - consulta n8n/Redis |
| `supabase/functions/close-service/index.ts` | **Criar** - atualiza attendanceMode para automated |
| `supabase/config.toml` | Adicionar config das 2 novas functions |
| `src/hooks/useEncerramento.ts` | Chamar close-service ao encerrar |

### Seguranca

A URL do n8n sera usada diretamente nas edge functions (server-side), nunca exposta no frontend. As edge functions rodam no backend, portanto a URL fica protegida.

