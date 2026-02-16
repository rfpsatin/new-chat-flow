ALTER TABLE public.conversas
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS channel text,
  ADD COLUMN IF NOT EXISTS n8n_webhook_id text,
  ADD COLUMN IF NOT EXISTS human_mode boolean DEFAULT false;