ALTER TABLE public.contatos
  ADD COLUMN IF NOT EXISTS tp_contato text NOT NULL DEFAULT 'N',
  ADD COLUMN IF NOT EXISTS tag_origem text;