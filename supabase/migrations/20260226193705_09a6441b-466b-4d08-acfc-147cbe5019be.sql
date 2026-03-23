CREATE OR REPLACE FUNCTION public.encerrar_conversa(p_conversa_id uuid, p_motivo_id uuid, p_usuario_id uuid, p_resumo text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.conversas
  SET status                 = 'encerrado',
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