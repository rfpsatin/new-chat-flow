-- Habilitar RLS na nova tabela protocolo_contador
ALTER TABLE public.protocolo_contador ENABLE ROW LEVEL SECURITY;

-- Somente funções internas (SECURITY DEFINER) e service_role acessam a tabela
-- Usuários autenticados não precisam de acesso direto
CREATE POLICY "Sem acesso direto ao protocolo_contador"
  ON public.protocolo_contador
  FOR ALL
  USING (false);

-- Corrigir search_path mutável nas funções novas
CREATE OR REPLACE FUNCTION public.get_next_nr_protocolo()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hoje date := CURRENT_DATE;
  seq int;
  prefixo text := to_char(hoje, 'YYYYMMDD');
BEGIN
  INSERT INTO public.protocolo_contador (dia, proximo)
  VALUES (hoje, 1)
  ON CONFLICT (dia) DO UPDATE SET proximo = public.protocolo_contador.proximo + 1
  RETURNING proximo INTO seq;
  RETURN prefixo || '-' || lpad(seq::text, 7, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_nr_protocolo_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.nr_protocolo IS NULL OR NEW.nr_protocolo = '' THEN
    NEW.nr_protocolo := public.get_next_nr_protocolo();
  END IF;
  RETURN NEW;
END;
$$;