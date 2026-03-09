-- Add document media columns to mensagens_ativas (URL from Whapi for PDF etc.)
alter table public.mensagens_ativas
  add column if not exists media_url text,
  add column if not exists media_kind text,
  add column if not exists media_filename text,
  add column if not exists media_mime text;
