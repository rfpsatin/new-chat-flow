ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS agente_ia_ativo boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.empresas.agente_ia_ativo IS
  'Quando true, novas conversas iniciadas pelo cliente entram com status bot. Quando false, entram como esperando_tria (triagem humana).';