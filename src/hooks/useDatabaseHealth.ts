import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DbOverview {
  db_size_bytes: number;
  db_size_pretty: string;
  active_connections: number;
  max_connections: number;
  cache_hit_ratio: number;
}

interface ConnectionState {
  state: string;
  count: number;
}

interface TableStat {
  table_name: string;
  total_size: string;
  data_size: string;
  index_size: string;
  estimated_rows: number;
  n_dead_tup: number;
  seq_scan: number;
  idx_scan: number;
}

export interface DatabaseHealthData {
  overview: DbOverview | null;
  connectionStates: ConnectionState[];
  tableStats: TableStat[];
}

export function useDatabaseHealth() {
  const [data, setData] = useState<DatabaseHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [overviewRes, connStatesRes, tableStatsRes] = await Promise.all([
        supabase.rpc('get_db_health_overview' as any),
        supabase.rpc('get_db_connection_states' as any),
        supabase.rpc('get_db_table_stats' as any),
      ]);

      if (overviewRes.error) throw new Error(overviewRes.error.message);
      if (connStatesRes.error) throw new Error(connStatesRes.error.message);
      if (tableStatsRes.error) throw new Error(tableStatsRes.error.message);

      const ov = (overviewRes.data as any)?.[0];

      setData({
        overview: ov ? {
          db_size_bytes: Number(ov.db_size_bytes),
          db_size_pretty: String(ov.db_size_pretty),
          active_connections: Number(ov.active_connections),
          max_connections: Number(ov.max_connections),
          cache_hit_ratio: Number(ov.cache_hit_ratio),
        } : null,
        connectionStates: ((connStatesRes.data as any) ?? []).map((r: any) => ({
          state: r.state ?? 'unknown',
          count: Number(r.count),
        })),
        tableStats: ((tableStatsRes.data as any) ?? []).map((r: any) => ({
          table_name: r.table_name,
          total_size: r.total_size,
          data_size: r.data_size,
          index_size: r.index_size,
          estimated_rows: Number(r.estimated_rows),
          n_dead_tup: Number(r.n_dead_tup),
          seq_scan: Number(r.seq_scan),
          idx_scan: Number(r.idx_scan),
        })),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao consultar saúde do banco');
    } finally {
      setIsLoading(false);
    }
  };

  return { data, isLoading, error, fetchHealth };
}
