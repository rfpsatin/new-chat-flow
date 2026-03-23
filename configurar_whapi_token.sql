-- ============================================
-- CONFIGURAR TOKEN DO WHAPI.CLOUD
-- Token: sJ1eJi7eqjfInqYmzm2yCsjU2hR3bZ8V
-- ============================================

-- EXECUTE ESTE SCRIPT NO SUPABASE DASHBOARD > SQL EDITOR

-- 1. Primeiro, veja quais empresas existem:
SELECT 
  id,
  nome_fantasia,
  razao_social,
  CASE 
    WHEN whapi_token IS NULL THEN '❌ Token não configurado'
    ELSE '✅ Token já configurado'
  END as status_token
FROM public.empresas
ORDER BY created_at DESC;

-- 2. Atualizar TODAS as empresas com o token:
UPDATE public.empresas 
SET whapi_token = 'sJ1eJi7eqjfInqYmzm2yCsjU2hR3bZ8V'
WHERE whapi_token IS NULL OR whapi_token = '';

-- 3. OU atualizar uma empresa específica (substitua o ID):
-- UPDATE public.empresas 
-- SET whapi_token = 'sJ1eJi7eqjfInqYmzm2yCsjU2hR3bZ8V'
-- WHERE id = 'SUBSTITUA_PELO_ID_DA_EMPRESA';

-- 4. Verificar se foi configurado corretamente:
SELECT 
  id,
  nome_fantasia,
  razao_social,
  CASE 
    WHEN whapi_token IS NULL THEN '❌ Token não configurado'
    WHEN whapi_token = 'sJ1eJi7eqjfInqYmzm2yCsjU2hR3bZ8V' THEN '✅ Token configurado corretamente'
    ELSE '⚠️ Token diferente do esperado'
  END as token_status,
  CASE 
    WHEN whapi_token IS NOT NULL THEN length(whapi_token) || ' caracteres'
    ELSE NULL
  END as token_length
FROM public.empresas
ORDER BY created_at DESC;
