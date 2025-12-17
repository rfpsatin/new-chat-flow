# 🔧 Como Configurar o Token do Whapi.Cloud

## Token fornecido:
```
sJ1eJi7eqjfInqYmzm2yCsjU2hR3bZ8V
```

## 📝 Passo a Passo:

### Opção 1: Via Supabase Dashboard (Recomendado)

1. **Acesse o Supabase Dashboard:**
   - Vá em: https://supabase.com/dashboard
   - Selecione seu projeto

2. **Abra o SQL Editor:**
   - No menu lateral, clique em **SQL Editor**
   - Clique em **New query**

3. **Execute o script:**
   - Abra o arquivo `configurar_whapi_token.sql`
   - Copie e cole o conteúdo no SQL Editor
   - Execute o script (botão Run ou Ctrl+Enter)

4. **Verifique o resultado:**
   - O script mostrará quais empresas foram atualizadas
   - Confirme que o status mostra "✅ Token configurado corretamente"

### Opção 2: Via Código (TypeScript)

Se preferir fazer via código, você pode executar:

```typescript
import { supabase } from '@/integrations/supabase/client';

// Atualizar todas as empresas
const { error } = await supabase
  .from('empresas')
  .update({ whapi_token: 'sJ1eJi7eqjfInqYmzm2yCsjU2hR3bZ8V' })
  .is('whapi_token', null);

// OU atualizar uma empresa específica
const { error } = await supabase
  .from('empresas')
  .update({ whapi_token: 'sJ1eJi7eqjfInqYmzm2yCsjU2hR3bZ8V' })
  .eq('id', 'ID_DA_EMPRESA');
```

## ✅ Verificação

Após configurar, você pode verificar executando:

```sql
SELECT 
  id,
  nome_fantasia,
  CASE 
    WHEN whapi_token = 'sJ1eJi7eqjfInqYmzm2yCsjU2hR3bZ8V' THEN '✅ Configurado'
    ELSE '❌ Não configurado'
  END as status
FROM public.empresas;
```

## 🚀 Próximos Passos

Após configurar o token:
1. ✅ Token configurado na tabela `empresas`
2. ✅ Teste enviando uma mensagem pelo frontend
3. ✅ Verifique os logs da Edge Function se houver erros

