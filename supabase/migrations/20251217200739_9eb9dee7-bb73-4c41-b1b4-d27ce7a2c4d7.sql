-- Função para supervisora encaminhar conversa para um atendente
-- Muda status de esperando_tria → fila_humano e define o agente responsável
CREATE OR REPLACE FUNCTION public.encaminhar_para_atendente(p_conversa_id uuid, p_agente_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validar se agente é da mesma empresa e está ativo
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
      updated_at = now()
  WHERE id = p_conversa_id
    AND status = 'esperando_tria';
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversa não encontrada ou não está aguardando triagem';
  END IF;
END;
$$;

-- Função para atendente assumir conversa que foi encaminhada para ele
-- Muda status de fila_humano → em_atendimento_humano
-- Apenas o agente designado pode assumir
CREATE OR REPLACE FUNCTION public.assumir_conversa(p_conversa_id uuid, p_agente_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validar que o agente é o designado para esta conversa
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
      updated_at = now()
  WHERE id = p_conversa_id
    AND status = 'fila_humano'
    AND agente_responsavel_id = p_agente_id;
END;
$$;