import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Campanha,
  CampanhaDestinatario,
  CampanhaStats,
} from '@/types/atendimento';
import { useMemo } from 'react';

const sb = supabase as any;

const CAMPANHAS_PAGE_SIZE = 20;

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

export type CampanhasFiltros = {
  nome?: string;
  tags?: string;
  status?: string;
  modo_resposta?: string;
};

/** Lista de campanhas (stats) paginada. "Carregar mais" via fetchNextPage. Aceita filtros opcionais. */
export function useCampanhasStatsInfinite(empresaId: string, filtros?: CampanhasFiltros) {
  const infinite = useInfiniteQuery({
    queryKey: ['campanhas-stats-infinite', empresaId, filtros ?? {}],
    queryFn: async ({ pageParam }) => {
      let query = sb
        .from('vw_campanha_stats')
        .select('*')
        .eq('empresa_id', empresaId);

      if (filtros?.nome?.trim()) {
        query = query.ilike('nome', `%${filtros.nome.trim()}%`);
      }
      if (filtros?.tags?.trim()) {
        const tagList = filtros.tags
          .split(/[\s,]+/)
          .map((t) => t.trim())
          .filter(Boolean);
        if (tagList.length > 0) {
          query = query.overlaps('tags', tagList);
        }
      }
      if (filtros?.status?.trim()) {
        query = query.eq('status', filtros.status.trim());
      }
      if (filtros?.modo_resposta?.trim()) {
        query = query.eq('modo_resposta', filtros.modo_resposta.trim());
      }

      const { data, error } = await query
        .order('iniciada_em', { ascending: false, nullsFirst: false })
        .order('agendado_para', { ascending: false, nullsFirst: false })
        .range(pageParam, pageParam + CAMPANHAS_PAGE_SIZE - 1);
      if (error) throw error;
      return (data ?? []) as CampanhaStats[];
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === CAMPANHAS_PAGE_SIZE ? allPages.length * CAMPANHAS_PAGE_SIZE : undefined,
    initialPageParam: 0,
    enabled: !!empresaId,
  });

  const data = useMemo(
    () => infinite.data?.pages.flat() ?? [],
    [infinite.data?.pages],
  );

  return {
    ...infinite,
    data,
    fetchNextPage: infinite.fetchNextPage,
    hasNextPage: infinite.hasNextPage,
    isFetchingNextPage: infinite.isFetchingNextPage,
  };
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
    refetchInterval: campanhaId ? 15000 : false,
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
      qc.invalidateQueries({ queryKey: ['campanhas-stats-infinite'] });
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
      qc.invalidateQueries({ queryKey: ['campanhas-stats-infinite'] });
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
      qc.invalidateQueries({ queryKey: ['campanhas-stats-infinite'] });
    },
  });
}

/** Atualiza apenas o status da campanha (ex: pausar, retomar). */
export function useAtualizarStatusCampanha() {
  const qc = useQueryClient();
  return useMutation<
    Campanha,
    Error,
    { campanhaId: string; status: Campanha['status'] }
  >({
    mutationFn: async ({ campanhaId, status }) => {
      const { data, error } = await sb
        .from('campanhas')
        .update({
          status,
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
      qc.invalidateQueries({ queryKey: ['campanhas-stats-infinite'] });
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
      qc.invalidateQueries({ queryKey: ['campanhas-stats-infinite'] });
    },
  });
}

export function useExcluirCampanha() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      const { error } = await sb
        .from('campanhas')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['campanhas'] });
      qc.invalidateQueries({ queryKey: ['campanha', id] });
      qc.invalidateQueries({ queryKey: ['campanhas-stats'] });
      qc.invalidateQueries({ queryKey: ['campanhas-stats-infinite'] });
    },
  });
}

export function useReagendarErrosCampanha() {
  const qc = useQueryClient();
  return useMutation<
    { success: boolean },
    Error,
    { campanhaId: string; agendado_para: string }
  >({
    mutationFn: async ({ campanhaId, agendado_para }) => {
      const { data, error } = await supabase.functions.invoke('reschedule-campaign-errors', {
        body: {
          campanha_id: campanhaId,
          agendado_para,
        },
      });
      if (error) throw new Error(error.message || 'Falha ao reagendar erros da campanha');
      if (!data?.success) {
        throw new Error(data?.error || 'Falha ao reagendar erros da campanha');
      }
      return data;
    },
    onSuccess: (_, { campanhaId }) => {
      qc.invalidateQueries({ queryKey: ['campanhas'] });
      qc.invalidateQueries({ queryKey: ['campanha', campanhaId] });
      qc.invalidateQueries({ queryKey: ['campanha-destinatarios', campanhaId] });
      qc.invalidateQueries({ queryKey: ['campanhas-stats'] });
      qc.invalidateQueries({ queryKey: ['campanhas-stats-infinite'] });
    },
  });
}
