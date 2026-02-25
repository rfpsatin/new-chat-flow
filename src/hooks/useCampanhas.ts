import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Campanha,
  CampanhaDestinatario,
  CampanhaStats,
} from '@/types/atendimento';

const sb = supabase as any;

export function useCampanhas(empresaId: string) {
  return useQuery({
    queryKey: ['campanhas', empresaId],
    queryFn: async () => {
      const { data, error } = await sb
        .from('campanhas')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Campanha[];
    },
    enabled: !!empresaId,
  });
}

export function useCampanhasStats(empresaId: string) {
  return useQuery({
    queryKey: ['campanhas-stats', empresaId],
    queryFn: async () => {
      const { data, error } = await sb
        .from('vw_campanha_stats')
        .select('*')
        .eq('empresa_id', empresaId);
      if (error) throw error;
      return data as CampanhaStats[];
    },
    enabled: !!empresaId,
  });
}

export function useCampanha(campanhaId: string | null) {
  return useQuery({
    queryKey: ['campanha', campanhaId],
    queryFn: async () => {
      if (!campanhaId) return null;
      const { data, error } = await sb
        .from('campanhas')
        .select('*')
        .eq('id', campanhaId)
        .single();
      if (error) throw error;
      return data as Campanha;
    },
    enabled: !!campanhaId,
  });
}

export function useCampanhaDestinatarios(campanhaId: string | null) {
  return useQuery({
    queryKey: ['campanha-destinatarios', campanhaId],
    queryFn: async () => {
      if (!campanhaId) return [];
      const { data, error } = await sb
        .from('campanha_destinatarios')
        .select('*')
        .eq('campanha_id', campanhaId)
        .order('created_at');
      if (error) throw error;
      return data as CampanhaDestinatario[];
    },
    enabled: !!campanhaId,
  });
}

export function useCriarCampanha() {
  const qc = useQueryClient();
  return useMutation<Campanha, Error, Partial<Campanha>>({
    mutationFn: async (payload) => {
      const { data, error } = await sb
        .from('campanhas')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as Campanha;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campanhas'] });
      qc.invalidateQueries({ queryKey: ['campanhas-stats'] });
    },
  });
}

export function useAtualizarCampanha() {
  const qc = useQueryClient();
  return useMutation<Campanha, Error, { id: string; payload: Partial<Campanha> }>({
    mutationFn: async ({ id, payload }) => {
      const { data, error } = await sb
        .from('campanhas')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Campanha;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['campanhas'] });
      qc.invalidateQueries({ queryKey: ['campanha', id] });
      qc.invalidateQueries({ queryKey: ['campanhas-stats'] });
    },
  });
}

export function useAgendarCampanha() {
  const qc = useQueryClient();
  return useMutation<Campanha, Error, { campanhaId: string; agendado_para: string }>({
    mutationFn: async ({ campanhaId, agendado_para }) => {
      const { data, error } = await sb
        .from('campanhas')
        .update({
          status: 'agendada',
          agendado_para,
          updated_at: new Date().toISOString(),
        })
        .eq('id', campanhaId)
        .select()
        .single();
      if (error) throw error;
      return data as Campanha;
    },
    onSuccess: (_, { campanhaId }) => {
      qc.invalidateQueries({ queryKey: ['campanhas'] });
      qc.invalidateQueries({ queryKey: ['campanha', campanhaId] });
      qc.invalidateQueries({ queryKey: ['campanhas-stats'] });
    },
  });
}

export function useAdicionarDestinatarios() {
  const qc = useQueryClient();
  return useMutation<{ added: number }, Error, { campanha_id: string; contato_ids: string[]; empresa_id: string }>({
    mutationFn: async ({ campanha_id, contato_ids, empresa_id }) => {
      const contatos = await supabase
        .from('contatos')
        .select('id, whatsapp_numero')
        .eq('empresa_id', empresa_id)
        .in('id', contato_ids);
      if (contatos.error) throw contatos.error;

      const rows = (contatos.data || []).map((c) => ({
        campanha_id,
        contato_id: c.id,
        whatsapp_numero: c.whatsapp_numero,
      }));

      const { error } = await sb.from('campanha_destinatarios').upsert(rows, {
        onConflict: 'campanha_id,contato_id',
        ignoreDuplicates: true,
      });
      if (error) throw error;
      return { added: rows.length };
    },
    onSuccess: (_, { campanha_id }) => {
      qc.invalidateQueries({ queryKey: ['campanha-destinatarios', campanha_id] });
      qc.invalidateQueries({ queryKey: ['campanhas-stats'] });
    },
  });
}
