
-- Add column to store the status before closing
ALTER TABLE public.conversas ADD COLUMN IF NOT EXISTS status_ao_encerrar text;

-- Update encerrar_conversa to save status before overwriting
CREATE OR REPLACE FUNCTION public.encerrar_conversa(p_conversa_id uuid, p_motivo_id uuid, p_usuario_id uuid, p_resumo text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.conversas
  SET status_ao_encerrar     = status,
      status                 = 'encerrado',
      motivo_encerramento_id = p_motivo_id,
      encerrado_por_id       = p_usuario_id,
      encerrado_em           = now(),
      resumo                 = coalesce(p_resumo, resumo),
      updated_at             = now(),
      origem_inicial         = null,
      origem_final           = null,
      human_mode             = false
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
$function$;

-- Recreate history view to include status_ao_encerrar
DROP VIEW IF EXISTS public.vw_historico_conversas;
CREATE VIEW public.vw_historico_conversas 
WITH (security_invoker = true) AS
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
  c.campanha_id,
  c.status_ao_encerrar
FROM public.conversas c
LEFT JOIN public.contatos ct ON ct.id = c.contato_id
LEFT JOIN public.motivos_encerramento me ON me.id = c.motivo_encerramento_id
LEFT JOIN public.usuarios u ON u.id = c.agente_responsavel_id
WHERE c.status = 'encerrado';
