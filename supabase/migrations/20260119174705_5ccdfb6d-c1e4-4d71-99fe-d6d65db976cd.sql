-- Adicionar colunas para informações do canal Whapi
ALTER TABLE public.empresas
ADD COLUMN IF NOT EXISTS whapi_channel_name TEXT,
ADD COLUMN IF NOT EXISTS whapi_phone TEXT,
ADD COLUMN IF NOT EXISTS whapi_work_period TEXT;