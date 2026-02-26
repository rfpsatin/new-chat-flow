-- 1. Coluna origem_final
ALTER TABLE public.conversas
  ADD COLUMN IF NOT EXISTS origem_final text;

-- 2. Ajustar CHECK de origem_inicial para permitir atendente
ALTER TABLE public.conversas
  DROP CONSTRAINT IF EXISTS conversas_origem_inicial_check;

ALTER TABLE public.conversas
  ADD CONSTRAINT conversas_origem_inicial_check
  CHECK (origem_inicial IS NULL OR origem_inicial IN ('cliente', 'atendente', 'agente', 'sistema', 'campanha'));

COMMENT ON COLUMN public.conversas.origem_inicial IS 'Quem iniciou a sessão: cliente (inbound), atendente (iniciou pelo hub), agente, sistema ou campanha. Zerado ao encerrar.';
COMMENT ON COLUMN public.conversas.origem_final IS 'Quem continuará a conversa após resposta do cliente (escolhido ao criar conversa/campanha). Zerado ao encerrar.';

-- 3. Views: incluir origem_final
DROP VIEW IF EXISTS public.vw_fila_atendimento;
CREATE VIEW public.vw_fila_atendimento AS
SELECT
  c.id AS conversa_id,
  c.empresa_id,
  co.id AS contato_id,
  co.nome AS contato_nome,
  co.whatsapp_numero,
  c.status,
  c.last_message_at,
  c.created_at,
  c.agente_responsavel_id,
  u.nome AS agente_nome,
  c.resumo,
  c.origem,
  c.channel,
  c.nr_protocolo,
  c.origem_inicial,
  c.origem_final,
  c.campanha_id
FROM public.conversas c
JOIN public.contatos co ON co.id = c.contato_id
LEFT JOIN public.usuarios u ON u.id = c.agente_responsavel_id
WHERE c.status = ANY (ARRAY['bot'::text, 'esperando_tria'::text, 'fila_humano'::text, 'em_atendimento_humano'::text])
ORDER BY c.last_message_at DESC;

DROP VIEW IF EXISTS public.vw_historico_conversas;
CREATE VIEW public.vw_historico_conversas AS
SELECT
  c.id AS conversa_id,
  c.contato_id,
  c.empresa_id,
  c.canal,
  c.status,
  c.created_at AS iniciado_em,
  c.encerrado_em,
  me.descricao AS motivo_encerramento,
  c.resumo,
  c.nota_satisfacao,
  ct.nome AS contato_nome,
  ct.whatsapp_numero,
  c.agente_responsavel_id,
  u.nome AS agente_nome,
  c.nr_protocolo,
  c.origem_inicial,
  c.origem_final,
  c.campanha_id
FROM public.conversas c
LEFT JOIN public.contatos ct ON ct.id = c.contato_id
LEFT JOIN public.motivos_encerramento me ON me.id = c.motivo_encerramento_id
LEFT JOIN public.usuarios u ON u.id = c.agente_responsavel_id
WHERE c.status = 'encerrado';

-- 4. Encerrar conversa: zerar origem_inicial e origem_final
CREATE OR REPLACE FUNCTION public.encerrar_conversa(
  p_conversa_id         uuid,
  p_motivo_id           uuid,
  p_usuario_id          uuid,
  p_resumo              text DEFAULT null
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversas
  SET status                 = 'encerrado',
      motivo_encerramento_id = p_motivo_id,
      encerrado_por_id       = p_usuario_id,
      encerrado_em           = now(),
      resumo                 = coalesce(p_resumo, resumo),
      updated_at             = now(),
      origem_inicial         = null,
      origem_final           = null
  WHERE id = p_conversa_id;

  INSERT INTO public.mensagens_historico (
    empresa_id, conversa_id, contato_id, direcao, tipo_remetente, remetente_id, conteudo, payload, criado_em
  )
  SELECT
    empresa_id, conversa_id, contato_id, direcao, tipo_remetente, remetente_id, conteudo, payload, criado_em
  FROM public.mensagens_ativas
  WHERE conversa_id = p_conversa_id;

  DELETE FROM public.mensagens_ativas
  WHERE conversa_id = p_conversa_id;
END;
$$;