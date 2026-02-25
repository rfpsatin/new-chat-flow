-- Add modo_resposta to campanhas: 'agente' (bot/n8n responds) or 'atendente' (human queue only).
-- Default 'agente' keeps existing campaigns behaving as today.
ALTER TABLE public.campanhas
  ADD COLUMN IF NOT EXISTS modo_resposta text DEFAULT 'agente';

ALTER TABLE public.campanhas
  DROP CONSTRAINT IF EXISTS campanhas_modo_resposta_check;

ALTER TABLE public.campanhas
  ADD CONSTRAINT campanhas_modo_resposta_check
  CHECK (modo_resposta IS NULL OR modo_resposta IN ('agente', 'atendente'));

COMMENT ON COLUMN public.campanhas.modo_resposta IS 'Quem responde após interação: agente (bot/n8n) ou atendente (fila humana).';
