# Guia de Teste - API Whapi.Cloud

## 📋 Pré-requisitos

1. **Token do Whapi.Cloud**
   - Acesse: https://whapi.cloud
   - Crie uma conta ou faça login
   - Obtenha seu token de autenticação
   - Conecte seu número de WhatsApp

2. **Aplicar Migração**
   ```bash
   # Se estiver usando Supabase CLI localmente
   supabase db reset
   # OU
   supabase migration up
   ```

## 🔧 Configuração

### Passo 1: Configurar o Token na Tabela `empresas`

Você precisa atualizar a tabela `empresas` com o token do Whapi.Cloud. Você pode fazer isso de 3 formas:

#### Opção A: Via SQL direto no Supabase Dashboard
```sql
UPDATE public.empresas 
SET whapi_token = 'SEU_TOKEN_AQUI' 
WHERE id = 'ID_DA_EMPRESA';
```

#### Opção B: Via Supabase Client no código
```typescript
const { error } = await supabase
  .from('empresas')
  .update({ whapi_token: 'SEU_TOKEN_AQUI' })
  .eq('id', 'ID_DA_EMPRESA');
```

#### Opção C: Via Supabase CLI
```bash
supabase db execute "UPDATE public.empresas SET whapi_token = 'SEU_TOKEN' WHERE id = 'ID_EMPRESA';"
```

## 🧪 Testes

### Teste 1: Testar Edge Function Diretamente

Use o comando curl ou Postman para testar a função:

```bash
curl -X POST https://SEU_PROJETO.supabase.co/functions/v1/whapi-send-message \
  -H "Authorization: Bearer SEU_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "empresa_id": "ID_DA_EMPRESA",
    "to": "5511999999999",
    "message": "Mensagem de teste"
  }'
```

**Resposta esperada (sucesso):**
```json
{
  "success": true,
  "message_id": "wamid.xxx",
  "response": { ... }
}
```

**Resposta esperada (erro):**
```json
{
  "error": "Whapi token not configured",
  "message": "Configure o token do Whapi.Cloud na empresa antes de enviar mensagens"
}
```

### Teste 2: Testar pelo Frontend (Interface)

1. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

2. **Acesse a aplicação** e faça login

3. **Vá para a página de Fila** ou selecione uma conversa

4. **Envie uma mensagem:**
   - Selecione uma conversa ativa
   - Digite uma mensagem no campo de input
   - Clique em enviar

5. **Verifique:**
   - A mensagem deve aparecer no chat
   - A mensagem deve ser enviada via WhatsApp
   - Verifique o WhatsApp do destinatário

### Teste 3: Verificar Logs

#### Logs da Edge Function (Supabase Dashboard)
1. Acesse: https://supabase.com/dashboard
2. Vá em **Edge Functions** > **whapi-send-message**
3. Clique em **Logs**
4. Procure por logs com `[requestId]` para rastrear requisições

#### Logs do Console do Navegador
1. Abra o DevTools (F12)
2. Vá na aba **Console**
3. Procure por erros relacionados ao envio de mensagens

## 🔍 Troubleshooting

### Erro: "Whapi token not configured"
- **Causa:** Token não foi configurado na tabela empresas
- **Solução:** Execute o Passo 1 acima

### Erro: "Invalid phone number format"
- **Causa:** Número não está no formato correto
- **Solução:** Use formato internacional sem + (ex: `5511999999999`)

### Erro: "Failed to send message via Whapi"
- **Causa:** Token inválido ou número não conectado
- **Solução:** 
  - Verifique se o token está correto
  - Verifique se o número está conectado no Whapi.Cloud
  - Verifique os logs da Edge Function para mais detalhes

### Mensagem não aparece no WhatsApp
- **Causa:** Número não está no formato correto ou não existe no WhatsApp
- **Solução:**
  - Verifique se o número está no formato: `5511999999999` (sem +, sem espaços)
  - Verifique se o número existe no WhatsApp
  - Verifique os logs da API do Whapi

## 📝 Formato do Número de Telefone

O número deve estar no formato internacional:
- ✅ Correto: `5511999999999` (Brasil: 55 + DDD + número)
- ❌ Errado: `+55 11 99999-9999`
- ❌ Errado: `(11) 99999-9999`
- ❌ Errado: `11999999999` (sem código do país)

## 🔗 Links Úteis

- Documentação Whapi.Cloud: https://whapi.cloud/docs
- Dashboard Supabase: https://supabase.com/dashboard
- Logs Edge Functions: Supabase Dashboard > Edge Functions > Logs

