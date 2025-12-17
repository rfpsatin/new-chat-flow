-- Script de teste para configurar token do Whapi.Cloud
-- ATENÇÃO: Este arquivo é apenas para referência, não execute em produção sem segurança

-- 1. Ver empresas existentes
SELECT id, nome_fantasia, whapi_token IS NOT NULL as has_token
FROM public.empresas;

-- 2. Atualizar token do Whapi (SUBSTITUA OS VALORES)
-- UPDATE public.empresas 
-- SET whapi_token = 'SEU_TOKEN_DO_WHAPI_AQUI'
-- WHERE id = 'ID_DA_EMPRESA_AQUI';

-- 3. Verificar se foi atualizado
-- SELECT id, nome_fantasia, 
--        CASE 
--          WHEN whapi_token IS NULL THEN 'Token não configurado'
--          WHEN length(whapi_token) > 0 THEN 'Token configurado (' || length(whapi_token) || ' caracteres)'
--        END as token_status
-- FROM public.empresas
-- WHERE id = 'ID_DA_EMPRESA_AQUI';

