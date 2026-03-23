-- Adicionar campo whapi_token na tabela empresas
alter table public.empresas
  add column whapi_token text;

comment on column public.empresas.whapi_token is 'Token de autenticação da API do Whapi.Cloud para envio de mensagens';

