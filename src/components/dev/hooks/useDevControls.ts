import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';

interface CriarContatoParams {
  nome: string;
  whatsappNumero: string;
}

export function useCriarContato() {
  const queryClient = useQueryClient();
  const { currentUser } = useApp();

  return useMutation({
    mutationFn: async ({ nome, whatsappNumero }: CriarContatoParams) => {
      if (!currentUser?.empresa_id) throw new Error('Empresa não identificada');

      const { data, error } = await supabase
        .from('contatos')
        .insert({
          nome,
          whatsapp_numero: whatsappNumero,
          empresa_id: currentUser.empresa_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contatos'] });
    },
  });
}

interface CriarConversaParams {
  contatoId: string;
  status: string;
}

export function useCriarConversa() {
  const queryClient = useQueryClient();
  const { currentUser } = useApp();

  return useMutation({
    mutationFn: async ({ contatoId, status }: CriarConversaParams) => {
      if (!currentUser?.empresa_id) throw new Error('Empresa não identificada');

      const { data, error } = await supabase
        .from('conversas')
        .insert({
          contato_id: contatoId,
          empresa_id: currentUser.empresa_id,
          status,
          canal: 'whatsapp',
          iniciado_por: 'cliente',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fila'] });
    },
  });
}

interface AlterarStatusParams {
  conversaId: string;
  novoStatus: string;
}

export function useAlterarStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversaId, novoStatus }: AlterarStatusParams) => {
      const { error } = await supabase
        .from('conversas')
        .update({ 
          status: novoStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversaId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fila'] });
    },
  });
}

export const STATUS_OPTIONS = [
  { value: 'bot', label: 'Bot' },
  { value: 'esperando_tria', label: 'Esperando Triagem' },
  { value: 'fila_humano', label: 'Fila Humano' },
  { value: 'em_atendimento_humano', label: 'Em Atendimento Humano' },
  { value: 'encerrado', label: 'Encerrado' },
];
