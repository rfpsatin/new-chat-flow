import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FilaAtendimento } from '@/types/atendimento';
import { useMotivosEncerramento } from '@/hooks/useEncerramento';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EncerrarEmLoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversas: FilaAtendimento[];
  empresaId: string;
  usuarioId: string;
  onComplete: () => void;
}

const MENSAGEM_PESQUISA = `📊 *Avalie nosso atendimento!*

Por favor, responda com um número de 1 a 5:

1️⃣ Muito ruim
2️⃣ Ruim  
3️⃣ Regular
4️⃣ Bom
5️⃣ Excelente

Sua opinião é muito importante para nós! 🙏`;

export function EncerrarEmLoteDialog({
  open,
  onOpenChange,
  conversas,
  empresaId,
  usuarioId,
  onComplete,
}: EncerrarEmLoteDialogProps) {
  const [etapa, setEtapa] = useState<1 | 2>(1);
  const [motivoId, setMotivoId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();
  const { data: motivos } = useMotivosEncerramento(empresaId);

  const handleClose = () => {
    setEtapa(1);
    setMotivoId('');
    onOpenChange(false);
  };

  const handleConfirmarEtapa1 = () => {
    if (!motivoId) {
      toast.error('Selecione um motivo de encerramento');
      return;
    }
    setEtapa(2);
  };

  const executarEncerramento = async (enviarAvaliacao: boolean) => {
    setIsProcessing(true);
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    let sucesso = 0;
    let erros = 0;

    for (const conversa of conversas) {
      try {
        if (enviarAvaliacao && conversa.whatsapp_numero) {
          // Send evaluation message
          await fetch(`${supabaseUrl}/functions/v1/whapi-send-message`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              empresa_id: empresaId,
              to: conversa.whatsapp_numero,
              message: MENSAGEM_PESQUISA,
            }),
          });

          await supabase
            .from('conversas')
            .update({ pesquisa_enviada_em: new Date().toISOString() })
            .eq('id', conversa.conversa_id);
        }

        // Check if n8n conversa for reset
        const { data: conversaData } = await supabase
          .from('conversas')
          .select('origem, channel, n8n_webhook_id, human_mode, origem_final')
          .eq('id', conversa.conversa_id!)
          .single();

        const isN8n = conversaData && (
          conversaData.origem || conversaData.channel || conversaData.n8n_webhook_id ||
          conversaData.human_mode === true || conversaData.origem_final === 'atendente'
        );

        if (isN8n) {
          await fetch(`${supabaseUrl}/functions/v1/n8n-reset-human-mode`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${supabaseAnonKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversa_id: conversa.conversa_id, empresa_id: empresaId }),
          }).catch(console.error);
        } else {
          const { data: contato } = await supabase
            .from('contatos')
            .select('whatsapp_numero')
            .eq('id', conversa.contato_id!)
            .single();
          if (contato) {
            await fetch(`${supabaseUrl}/functions/v1/close-service`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${supabaseAnonKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ conversa_id: conversa.conversa_id, empresa_id: empresaId, chat_id: contato.whatsapp_numero }),
            }).catch(console.error);
          }
        }

        // Encerrar conversa
        const { error } = await supabase.rpc('encerrar_conversa', {
          p_conversa_id: conversa.conversa_id!,
          p_motivo_id: motivoId,
          p_usuario_id: usuarioId,
        });

        if (error) throw error;
        sucesso++;
      } catch (err) {
        console.error('Erro ao encerrar conversa:', conversa.conversa_id, err);
        erros++;
      }
    }

    queryClient.invalidateQueries({ queryKey: ['fila'] });
    queryClient.invalidateQueries({ queryKey: ['conversa'] });
    queryClient.invalidateQueries({ queryKey: ['mensagens'] });

    if (erros === 0) {
      toast.success(`${sucesso} conversa${sucesso > 1 ? 's' : ''} encerrada${sucesso > 1 ? 's' : ''} com sucesso`);
    } else {
      toast.warning(`${sucesso} encerrada${sucesso > 1 ? 's' : ''}, ${erros} com erro`);
    }

    setIsProcessing(false);
    handleClose();
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {etapa === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>Encerrar {conversas.length} conversa{conversas.length > 1 ? 's' : ''}</DialogTitle>
              <DialogDescription>
                As conversas selecionadas serão encerradas e sairão da fila. As sessões ficarão armazenadas
                no histórico, mantendo a tag do estágio em que se encontravam.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <label className="text-sm font-medium">Motivo de encerramento</label>
              <Select value={motivoId} onValueChange={setMotivoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um motivo..." />
                </SelectTrigger>
                <SelectContent>
                  {motivos?.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.descricao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handleConfirmarEtapa1}>Confirmar</Button>
            </DialogFooter>
          </>
        )}
        {etapa === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>Enviar avaliação de atendimento?</DialogTitle>
              <DialogDescription>
                Deseja enviar a mensagem de avaliação de atendimento para as conversas selecionadas antes de encerrá-las?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => executarEncerramento(false)}
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Não enviar
              </Button>
              <Button
                onClick={() => executarEncerramento(true)}
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Sim, enviar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
