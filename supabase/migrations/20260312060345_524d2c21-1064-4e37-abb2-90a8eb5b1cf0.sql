
-- Function: get_db_health_overview
-- Returns database size, connection count, and cache hit ratio
CREATE OR REPLACE FUNCTION public.get_db_health_overview()
RETURNS TABLE(
  db_size_bytes bigint,
  db_size_pretty text,
  active_connections integer,
  max_connections integer,
  cache_hit_ratio numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    pg_database_size(current_database())::bigint AS db_size_bytes,
    pg_size_pretty(pg_database_size(current_database())) AS db_size_pretty,
    (SELECT count(*)::integer FROM pg_stat_activity) AS active_connections,
    (SELECT setting::integer FROM pg_settings WHERE name = 'max_connections') AS max_connections,
    CASE
      WHEN (SELECT sum(heap_blks_hit) + sum(heap_blks_read) FROM pg_statio_user_tables) > 0
      THEN round(100.0 * (SELECT sum(heap_blks_hit) FROM pg_statio_user_tables) / ((SELECT sum(heap_blks_hit) FROM pg_statio_user_tables) + (SELECT sum(heap_blks_read) FROM pg_statio_user_tables)), 2)
      ELSE 100
    END AS cache_hit_ratio;
END;
$$;

-- Function: get_db_connection_states
-- Returns connection count grouped by state
CREATE OR REPLACE FUNCTION public.get_db_connection_states()
RETURNS TABLE(
  state text,
  count integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    coalesce(a.state::text, 'background') AS state,
    count(*)::integer AS count
  FROM pg_stat_activity a
  GROUP BY a.state
  ORDER BY count DESC;
END;
$$;

-- Function: get_db_table_stats
-- Returns table-level stats for public schema
CREATE OR REPLACE FUNCTION public.get_db_table_stats()
RETURNS TABLE(
  table_name text,
  total_size text,
  data_size text,
  index_size text,
  estimated_rows bigint,
  n_dead_tup bigint,
  seq_scan bigint,
  idx_scan bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    s.relname::text AS table_name,
    pg_size_pretty(pg_total_relation_size(s.relid)) AS total_size,
    pg_size_pretty(pg_relation_size(s.relid)) AS data_size,
    pg_size_pretty(pg_total_relation_size(s.relid) - pg_relation_size(s.relid)) AS index_size,
    s.n_live_tup AS estimated_rows,
    s.n_dead_tup,
    s.seq_scan,
    s.idx_scan
  FROM pg_stat_user_tables s
  WHERE s.schemaname = 'public'
  ORDER BY pg_total_relation_size(s.relid) DESC;
END;
$$;

-- Function: get_acompanhamento_mensagens (already referenced in code)
CREATE OR REPLACE FUNCTION public.get_acompanhamento_mensagens(
  p_data_inicio timestamptz,
  p_data_fim timestamptz
)
RETURNS TABLE(
  empresa_id uuid,
  empresa_nome text,
  mensagens_recebidas bigint,
  conversas_fechadas bigint,
  em_aberto_total bigint,
  em_aberto_bot bigint,
  em_aberto_triagem bigint,
  em_aberto_fila bigint,
  em_aberto_atendimento bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    e.id AS empresa_id,
    coalesce(e.nome_fantasia, e.razao_social) AS empresa_nome,
    coalesce(msg.total, 0)::bigint AS mensagens_recebidas,
    coalesce(fechadas.total, 0)::bigint AS conversas_fechadas,
    coalesce(abertas.total, 0)::bigint AS em_aberto_total,
    coalesce(abertas.bot, 0)::bigint AS em_aberto_bot,
    coalesce(abertas.triagem, 0)::bigint AS em_aberto_triagem,
    coalesce(abertas.fila, 0)::bigint AS em_aberto_fila,
    coalesce(abertas.atendimento, 0)::bigint AS em_aberto_atendimento
  FROM public.empresas e
  LEFT JOIN LATERAL (
    SELECT count(*)::bigint AS total
    FROM public.vw_mensagens_consolidado m
    WHERE m.empresa_id = e.id
      AND m.direcao = 'in'
      AND m.criado_em >= p_data_inicio
      AND m.criado_em <= p_data_fim
  ) msg ON true
  LEFT JOIN LATERAL (
    SELECT count(*)::bigint AS total
    FROM public.conversas c
    WHERE c.empresa_id = e.id
      AND c.status = 'encerrado'
      AND c.encerrado_em >= p_data_inicio
      AND c.encerrado_em <= p_data_fim
  ) fechadas ON true
  LEFT JOIN LATERAL (
    SELECT
      count(*)::bigint AS total,
      count(*) FILTER (WHERE c.status = 'bot')::bigint AS bot,
      count(*) FILTER (WHERE c.status = 'esperando_tria')::bigint AS triagem,
      count(*) FILTER (WHERE c.status = 'fila_humano')::bigint AS fila,
      count(*) FILTER (WHERE c.status = 'em_atendimento_humano')::bigint AS atendimento
    FROM public.conversas c
    WHERE c.empresa_id = e.id
      AND c.status IN ('bot','esperando_tria','fila_humano','em_atendimento_humano')
  ) abertas ON true
  WHERE e.ativo = true
  ORDER BY empresa_nome;
END;
$$;
