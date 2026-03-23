-- Adicionar coluna whapi_token na tabela empresas
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS whapi_token text;