import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';

export interface WhapiConnectionInfo {
  whapi_status: string | null;
  whapi_status_raw: string | null;
  whapi_status_source: string | null;
  whapi_status_updated_at: string | null;
  whapi_last_error: string | null;
  whapi_last_qr_at: string | null;
  whapi_token: string | null;
}

export function useWhapiConnection() {
  const { currentUser } = useApp();
  const empresaId = currentUser?.empresa_id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: connectionInfo, isLoading } = useQuery({
    queryKey: ['whapi-connection', empresaId],
    queryFn: async () => {
      if (!empresaId) return null;
      const { data, error } = await supabase
        .from('empresas')
        .select(
          'whapi_status, whapi_status_raw, whapi_status_source, whapi_status_updated_at, whapi_last_error, whapi_last_qr_at, whapi_token'
        )
        .eq('id', empresaId)
        .single();

      if (error) throw error;
      return data as WhapiConnectionInfo;
    },
    enabled: !!empresaId,
    refetchInterval: 30000,
  });

  const refreshStatus = useMutation({
    mutationFn: async () => {
      if (!empresaId) throw new Error('Empresa não encontrada');
      const { data, error } = await supabase.functions.invoke('whapi-status', {
        body: { empresa_id: empresaId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whapi-connection', empresaId] });
      toast({
        title: 'Status atualizado',
        description: 'Status do Whapi consultado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao consultar status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const requestQr = useMutation({
    mutationFn: async () => {
      if (!empresaId) throw new Error('Empresa não encontrada');
      const { data, error } = await supabase.functions.invoke('whapi-qr', {
        body: { empresa_id: empresaId },
      });
      if (error) throw error;
      return data as { qr_image?: string | null };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whapi-connection', empresaId] });
      toast({
        title: 'QR gerado',
        description: 'QR code solicitado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao gerar QR',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const reconnect = useMutation({
    mutationFn: async () => {
      if (!empresaId) throw new Error('Empresa não encontrada');
      const { data, error } = await supabase.functions.invoke('whapi-reconnect', {
        body: { empresa_id: empresaId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whapi-connection', empresaId] });
      toast({
        title: 'Reconexão solicitada',
        description: 'Pedido de reconexão enviado para o Whapi.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao reconectar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateToken = useMutation({
    mutationFn: async (token: string) => {
      if (!empresaId) throw new Error('Empresa não encontrada');
      const { data, error } = await supabase.functions.invoke('whapi-config', {
        body: { empresa_id: empresaId, whapi_token: token },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whapi-connection', empresaId] });
      toast({
        title: 'Token atualizado',
        description: 'Token do Whapi salvo com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao salvar token',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    connectionInfo,
    isLoading,
    refreshStatus,
    requestQr,
    reconnect,
    updateToken,
  };
}
