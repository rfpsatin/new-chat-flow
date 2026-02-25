ALTER TABLE public.conversas
ADD COLUMN campanha_id uuid REFERENCES public.campanhas(id) ON DELETE SET NULL;