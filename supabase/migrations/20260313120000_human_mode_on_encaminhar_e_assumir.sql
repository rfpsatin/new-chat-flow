-- Ao encaminhar para triagem/atendente ou ao assumir conversa, marcar human_mode = true
-- para que conversation-attendance-status e n8n considerem a conversa em modo humano.

-- Encaminhar: esperando_tria → fila_humano (conversa designada a humano)
CREATE OR REPLACE FUNCTION public.encaminhar_para_atendente(p_conversa_id uuid, p_agente_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios u_ag
    JOIN public.conversas c ON c.id = p_conversa_id
    WHERE u_ag.id = p_agente_id
      AND u_ag.empresa_id = c.empresa_id
      AND u_ag.ativo = true
  ) THEN
    RAISE EXCEPTION 'Agente inválido ou de outra empresa';
  END IF;

  UPDATE public.conversas
  SET status = 'fila_humano',
      agente_responsavel_id = p_agente_id,
      human_mode = true,
      updated_at = now()
  WHERE id = p_conversa_id
    AND status = 'esperando_tria';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversa não encontrada ou não está aguardando triagem';
  END IF;
END;
$$;

-- Assumir: fila_humano → em_atendimento_humano (atendente assumiu)
CREATE OR REPLACE FUNCTION public.assumir_conversa(p_conversa_id uuid, p_agente_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.conversas
    WHERE id = p_conversa_id
      AND agente_responsavel_id = p_agente_id
      AND status = 'fila_humano'
  ) THEN
    RAISE EXCEPTION 'Conversa não designada para este agente ou status inválido';
  END IF;

  UPDATE public.conversas
  SET status = 'em_atendimento_humano',
      human_mode = true,
      updated_at = now()
  WHERE id = p_conversa_id
    AND status = 'fila_humano'
    AND agente_responsavel_id = p_agente_id;
END;
$$;
