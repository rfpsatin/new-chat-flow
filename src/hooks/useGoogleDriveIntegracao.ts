import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type GoogleDriveStatus = {
  connected: boolean;
  config: {
    empresa_id: string;
    google_user_email: string;
    google_drive_root_folder_id: string;
    token_expires_at: string;
    connected_at: string;
    updated_at: string;
    last_error: string | null;
  } | null;
};

export function useGoogleDriveIntegracao(empresaId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const statusQuery = useQuery({
    queryKey: ['google-drive-status', empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('google-drive-status', {
        body: { empresa_id: empresaId },
      });
      if (error) throw new Error(error.message);
      return data as GoogleDriveStatus;
    },
  });

  const iniciarConexao = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('google-drive-oauth-start', {
        body: { empresa_id: empresaId },
      });
      if (error) throw new Error(error.message);
      if (!data?.auth_url) throw new Error('Nao foi possivel iniciar a conexao com Google Drive.');
      return data.auth_url as string;
    },
    onSuccess: (authUrl) => {
      window.location.assign(authUrl);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao conectar Google Drive',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const atualizarStatus = () => {
    queryClient.invalidateQueries({ queryKey: ['google-drive-status', empresaId] });
  };

  return {
    status: statusQuery.data,
    isLoadingStatus: statusQuery.isLoading,
    iniciarConexao,
    atualizarStatus,
  };
}

