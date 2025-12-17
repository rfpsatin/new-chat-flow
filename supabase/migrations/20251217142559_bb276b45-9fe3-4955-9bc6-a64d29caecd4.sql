-- 1. View consolidada para relatórios (mensagens ativas + histórico)
CREATE OR REPLACE VIEW public.vw_mensagens_consolidado WITH (security_invoker = true) AS
SELECT
  'ativa'::text as origem,
  m.id,
  m.empresa_id,
  m.conversa_id,
  m.contato_id,
  m.direcao,
  m.tipo_remetente,
  m.remetente_id,
  m.conteudo,
  m.payload,
  m.criado_em,
  null::timestamptz as arquivado_em
FROM public.mensagens_ativas m
UNION ALL
SELECT
  'historico'::text as origem,
  mh.id,
  mh.empresa_id,
  mh.conversa_id,
  mh.contato_id,
  mh.direcao,
  mh.tipo_remetente,
  mh.remetente_id,
  mh.conteudo,
  mh.payload,
  mh.criado_em,
  mh.arquivado_em
FROM public.mensagens_historico mh;

-- 2. Função para solicitar atendimento humano (bot -> fila)
CREATE OR REPLACE FUNCTION public.solicitar_atendimento_humano(p_conversa_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversas
  SET status = 'esperando_tria',
      updated_at = now()
  WHERE id = p_conversa_id
    AND status = 'bot';
END;
$$;

-- 3. Melhorar função atribuir_agente com validação de empresa
DROP FUNCTION IF EXISTS public.atribuir_agente(uuid, uuid);

CREATE OR REPLACE FUNCTION public.atribuir_agente(
  p_conversa_id uuid,
  p_agente_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  SET status = 'em_atendimento_humano',
      agente_responsavel_id = p_agente_id,
      updated_at = now()
  WHERE id = p_conversa_id
    AND status IN ('esperando_tria', 'fila_humano');
END;
$$;

-- 4. Ajustar view vw_fila_atendimento para mostrar apenas fila (sem em_atendimento)
DROP VIEW IF EXISTS public.vw_fila_atendimento;

CREATE OR REPLACE VIEW public.vw_fila_atendimento WITH (security_invoker = true) AS
SELECT
  c.id as conversa_id,
  c.empresa_id,
  co.id as contato_id,
  co.nome as contato_nome,
  co.whatsapp_numero,
  c.status,
  c.last_message_at,
  c.created_at,
  c.agente_responsavel_id,
  u.nome as agente_nome,
  c.resumo
FROM public.conversas c
JOIN public.contatos co ON co.id = c.contato_id
LEFT JOIN public.usuarios u ON u.id = c.agente_responsavel_id
WHERE c.status IN ('esperando_tria', 'fila_humano')
ORDER BY c.last_message_at DESC;

-- 5. Popular tabela atendentes com dados dos usuários sup/opr
INSERT INTO public.atendentes (usuario_id, empresa_id, para_triagem, nome, ativo)
SELECT 
  id, 
  empresa_id, 
  CASE WHEN tipo_usuario = 'sup' THEN true ELSE false END,
  nome, 
  true
FROM public.usuarios
WHERE tipo_usuario IN ('sup', 'opr')
ON CONFLICT DO NOTHING;