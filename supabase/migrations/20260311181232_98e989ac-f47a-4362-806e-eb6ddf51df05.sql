-- Add reply/quote columns to mensagens_ativas
ALTER TABLE public.mensagens_ativas
  ADD COLUMN IF NOT EXISTS whatsapp_message_id text,
  ADD COLUMN IF NOT EXISTS reply_to_message_id bigint,
  ADD COLUMN IF NOT EXISTS reply_to_whatsapp_id text;

-- Index for looking up messages by whatsapp_message_id (used by webhook reply resolution)
CREATE INDEX IF NOT EXISTS idx_mensagens_ativas_whatsapp_message_id
  ON public.mensagens_ativas (empresa_id, conversa_id, whatsapp_message_id)
  WHERE whatsapp_message_id IS NOT NULL;