-- Adiciona coluna para registrar motivo do erro de envio em campanha_destinatarios
ALTER TABLE public.campanha_destinatarios
  ADD COLUMN IF NOT EXISTS erro_envio_msg text;

