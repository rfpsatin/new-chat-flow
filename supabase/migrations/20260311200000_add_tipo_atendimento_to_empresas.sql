-- Tipo de atendimento da empresa: usado como rótulo na fila (Marketing ou Comercial).
-- A cor (azul/verde) continua indicando a origem (chat web vs WhatsApp).
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS tipo_atendimento text NOT NULL DEFAULT 'comercial'
  CHECK (tipo_atendimento IN ('marketing', 'comercial'));

COMMENT ON COLUMN public.empresas.tipo_atendimento IS
  'Tipo de atendimento exibido na fila: marketing ou comercial. Cor (azul/verde) indica origem (web vs WhatsApp).';
