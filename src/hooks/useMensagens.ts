import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MensagemAtiva } from '@/types/atendimento';
import { useEffect } from 'react';

export function useMensagens(conversaId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mensagens', conversaId],
    queryFn: async () => {
      if (!conversaId) return [];
      
      const { data, error } = await supabase
        .from('mensagens_ativas')
        .select('*')
        .eq('conversa_id', conversaId)
        .order('criado_em', { ascending: true });
      
      if (error) throw error;
      return data as MensagemAtiva[];
    },
    enabled: !!conversaId,
  });

  // Real-time subscription for new messages
  useEffect(() => {
    if (!conversaId) return;

    const channel = supabase
      .channel(`mensagens-${conversaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens_ativas',
          filter: `conversa_id=eq.${conversaId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['mensagens', conversaId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversaId, queryClient]);

  return query;
}

export function useEnviarMensagem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      empresaId,
      conversaId,
      contato_id,
      conteudo,
      remetenteId,
      humanMode,
      whatsapp_numero,
      replyToMessageId,
      replyToWhatsappId,
    }: {
      empresaId: string;
      conversaId: string;
      contato_id: string;
      conteudo: string;
      remetenteId: string;
      humanMode?: boolean;
      whatsapp_numero: string;
      replyToMessageId?: number | null;
      replyToWhatsappId?: string | null;
    }) => {
      const isHuman = humanMode === true;
      const whapiBody = `#\"human_mode=${isHuman ? 'true' : 'false'}\"# ${conteudo}`;

      const { data: sendResult, error: whapiError } = await supabase.functions.invoke('whapi-send-message', {
        body: {
          empresa_id: empresaId,
          to: whatsapp_numero,
          message: whapiBody,
          reply_to_whatsapp_id: replyToWhatsappId ?? undefined,
        },
      });

      if (whapiError) throw new Error(whapiError.message || 'Erro ao enviar mensagem via Whapi');

      const whapiMessageId =
        sendResult?.message_id ??
        sendResult?.response?.message?.id ??
        sendResult?.response?.message?.message_id ??
        sendResult?.response?.messages?.[0]?.id ??
        sendResult?.response?.messages?.[0]?.message_id ??
        null;

      // Inserir mensagem diretamente no banco (webhook ignora from_me=true)
      await supabase.from('mensagens_ativas').insert({
        empresa_id: empresaId,
        conversa_id: conversaId,
        contato_id: contato_id,
        direcao: 'out',
        tipo_remetente: 'agente',
        remetente_id: remetenteId,
        conteudo: conteudo,
        whatsapp_message_id: whapiMessageId,
        reply_to_message_id: replyToMessageId ?? null,
        reply_to_whatsapp_id: replyToWhatsappId ?? null,
      });
    },
    onSuccess: (_, { conversaId }) => {
      queryClient.invalidateQueries({ queryKey: ['mensagens', conversaId] });
      queryClient.invalidateQueries({ queryKey: ['fila'] });
    },
  });
}

export function useEnviarArquivo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      empresaId,
      conversaId,
      contato_id,
      remetenteId,
      file,
      whatsapp_numero,
    }: {
      empresaId: string;
      conversaId: string;
      contato_id: string;
      remetenteId: string;
      file: File;
      whatsapp_numero: string;
    }) => {
      // 1. Fazer upload do arquivo para o storage para gerar uma URL pública
      //    Bucket esperado: "chat-media" (precisa existir no projeto Supabase)
      const bucket = 'chat-media';
      const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const path = `${empresaId}/${conversaId}/${uniqueSuffix}-${file.name}`;

      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file);

      if (uploadError) {
        throw new Error(uploadError.message || 'Erro ao fazer upload do arquivo');
      }

      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path);
      const mediaUrl = publicUrlData?.publicUrl;

      if (!mediaUrl) {
        throw new Error('Não foi possível obter a URL pública do arquivo');
      }

      // 3. Determinar o tipo de mídia a partir do MIME type
      const mime = file.type || '';
      let mediaKind: 'document' | 'image' | 'audio' = 'document';

      if (mime.startsWith('image/')) {
        mediaKind = 'image';
      } else if (mime.startsWith('audio/')) {
        mediaKind = 'audio';
      }

      // 4. Chamar a edge function para enviar a mídia via Whapi e registrar em mensagens_ativas
      const { error: whapiError } = await supabase.functions.invoke('whapi-send-media', {
        body: {
          empresa_id: empresaId,
          to: whatsapp_numero,
          media_url: mediaUrl,
          media_kind: mediaKind,
          filename: file.name,
          mime_type: mime || undefined,
          conversa_id: conversaId,
          contato_id,
          remetente_id: remetenteId,
        },
      });

      if (whapiError) {
        throw new Error(whapiError.message || 'Erro ao enviar arquivo via Whapi');
      }
    },
    onSuccess: (_, { conversaId }) => {
      queryClient.invalidateQueries({ queryKey: ['mensagens', conversaId] });
      queryClient.invalidateQueries({ queryKey: ['fila'] });
    },
  });
}

export function useMensagensHistorico(conversaId: string | null) {
  return useQuery({
    queryKey: ['mensagens-historico', conversaId],
    queryFn: async () => {
      if (!conversaId) return [];
      
      const { data, error } = await supabase
        .from('mensagens_historico')
        .select('*')
        .eq('conversa_id', conversaId)
        .order('criado_em', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!conversaId,
  });
}
