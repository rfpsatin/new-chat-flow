import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';

export interface WhapiConnectionEvent {
  id: string;
  empresa_id: string;
  source: string;
  event_type: string | null;
  state: string | null;
  payload: unknown;
  created_at: string;
}

export function useWhapiConnectionEvents(limit = 10) {
  const { empresaId } = useApp();

  return useQuery({
    queryKey: ['whapi-connection-events', empresaId, limit],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from('whapi_connection_events')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as WhapiConnectionEvent[];
    },
    enabled: !!empresaId,
  });
}
