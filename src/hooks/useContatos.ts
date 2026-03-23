import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Contato, HistoricoConversa } from '@/types/atendimento';
import { useMemo } from 'react';

const CONTATOS_PAGE_SIZE = 30;

export function useContatos(empresaId: string) {
  return useQuery({
    queryKey: ['contatos', empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contatos')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nome');
      
      if (error) throw error;
      return data as Contato[];
    },
    enabled: !!empresaId,
  });
}

/** Lista de contatos paginada (cadastro). Busca opcional no servidor; "Carregar mais" via fetchNextPage. */
export function useContatosInfinite(empresaId: string, search?: string) {
  const infinite = useInfiniteQuery({
    queryKey: ['contatos-infinite', empresaId, search ?? ''],
    queryFn: async ({ pageParam }) => {
      const term = (search ?? '').trim();
      let query = supabase
        .from('contatos')
        .select('*')
        .eq('empresa_id', empresaId);

      if (term) {
        query = query.or(`nome.ilike.%${term}%,whatsapp_numero.ilike.%${term}%,telefone_numero.ilike.%${term}%`);
      }

      const { data, error } = await query
        .order('nome', { nullsFirst: false })
        .range(pageParam, pageParam + CONTATOS_PAGE_SIZE - 1);
      if (error) throw error;
      return (data ?? []) as Contato[];
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === CONTATOS_PAGE_SIZE ? allPages.length * CONTATOS_PAGE_SIZE : undefined,
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

export function useContato(contatoId: string | null) {
  return useQuery({
    queryKey: ['contato', contatoId],
    queryFn: async () => {
      if (!contatoId) return null;
      
      const { data, error } = await supabase
        .from('contatos')
        .select('*')
        .eq('id', contatoId)
        .single();
      
      if (error) throw error;
      return data as Contato;
    },
    enabled: !!contatoId,
  });
}

export function useHistoricoContato(contatoId: string | null) {
  return useQuery({
    queryKey: ['historico-contato', contatoId],
    queryFn: async () => {
      if (!contatoId) return [];
      
      const { data, error } = await supabase
        .from('vw_historico_conversas')
        .select('*')
        .eq('contato_id', contatoId)
        .order('iniciado_em', { ascending: false });
      
      if (error) throw error;
      return data as HistoricoConversa[];
    },
    enabled: !!contatoId,
  });
}
