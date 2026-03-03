
CREATE OR REPLACE FUNCTION public.forcar_atendimento_humano(p_conversa_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.conversas
  SET status = 'esperando_tria',
      human_mode = true,
      updated_at = now()
  WHERE id = p_conversa_id
    AND status = 'bot';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversa não encontrada ou não está no status bot';
  END IF;
END;
$$;
