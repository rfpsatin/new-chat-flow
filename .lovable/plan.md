

# Corrigir URL do webhook n8n em todas as Edge Functions

## Problema
As Edge Functions `close-service`, `check-attendance-mode` e `whapi-webhook` estão usando uma URL incorreta (`http://162.240.152.122/webhook/YKu4UqLlWMoZ4dUk`). A URL real de producao do n8n e `https://n8n.maringaai.com.br/webhook/maia-beach-tennis-demo`.

## Alteracoes

Atualizar a constante `N8N_WEBHOOK_URL` nos 3 arquivos:

1. **`supabase/functions/close-service/index.ts`** (linha 6)
   - De: `http://162.240.152.122/webhook/YKu4UqLlWMoZ4dUk`
   - Para: `https://n8n.maringaai.com.br/webhook/maia-beach-tennis-demo`

2. **`supabase/functions/check-attendance-mode/index.ts`** (linha 8)
   - De: `http://162.240.152.122/webhook/YKu4UqLlWMoZ4dUk`
   - Para: `https://n8n.maringaai.com.br/webhook/maia-beach-tennis-demo`

3. **`supabase/functions/whapi-webhook/index.ts`** (referencia inline na funcao)
   - De: `http://162.240.152.122/webhook/YKu4UqLlWMoZ4dUk`
   - Para: `https://n8n.maringaai.com.br/webhook/maia-beach-tennis-demo`

## Validacao
- Re-deploy das 3 funcoes
- Testar close-service via curl para confirmar que o n8n responde com sucesso (status 200)
- Verificar nos logs que o attendanceMode esta sendo alterado para "automated"

