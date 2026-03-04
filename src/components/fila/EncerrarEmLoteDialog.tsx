import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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

  const withTimeout = <T,>(
    operation: () => Promise<T>,
    timeoutMs = 15000,
    timeoutMessage = 'Operação demorou mais que o esperado'
  ) =>
    Promise.race([
      operation(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
      ),
    ]);

  const executarEncerramento = async (enviarAvaliacao: boolean) => {
    setIsProcessing(true);
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    let sucesso = 0;
    let erros = 0;

    try {
      for (const conversa of conversas) {
        try {
          if (!conversa.conversa_id) {
            erros++;
            continue;
          }

          // Se não enviar avaliação, encerra direto sem chamadas externas para evitar travamentos.
          if (enviarAvaliacao) {
            if (conversa.whatsapp_numero) {
              try {
                await withTimeout(() =>
                  fetch(`${supabaseUrl}/functions/v1/whapi-send-message`, {
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
                  })
                );

                await withTimeout(async () =>
                  supabase
                    .from('conversas')
                    .update({ pesquisa_enviada_em: new Date().toISOString() })
                    .eq('id', conversa.conversa_id)
                );
              } catch (sendError) {
                console.error('Erro ao enviar avaliação (seguindo encerramento):', conversa.conversa_id, sendError);
              }
            }

            try {
              const { data: conversaData } = await withTimeout(async () =>
                supabase
                  .from('conversas')
                  .select('origem, channel, n8n_webhook_id, human_mode, origem_final')
                  .eq('id', conversa.conversa_id)
                  .single()
              );

              const isN8n = conversaData && (
                conversaData.origem || conversaData.channel || conversaData.n8n_webhook_id ||
                conversaData.human_mode === true || conversaData.origem_final === 'atendente'
              );

              if (isN8n) {
                await withTimeout(() =>
                  fetch(`${supabaseUrl}/functions/v1/n8n-reset-human-mode`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${supabaseAnonKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ conversa_id: conversa.conversa_id, empresa_id: empresaId }),
                  })
                ).catch(console.error);
              } else {
                const { data: contato } = await withTimeout(async () =>
                  supabase
                    .from('contatos')
                    .select('whatsapp_numero')
                    .eq('id', conversa.contato_id!)
                    .single()
                );

                if (contato) {
                  await withTimeout(() =>
                    fetch(`${supabaseUrl}/functions/v1/close-service`, {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${supabaseAnonKey}`, 'Content-Type': 'application/json' },
                      body: JSON.stringify({ conversa_id: conversa.conversa_id, empresa_id: empresaId, chat_id: contato.whatsapp_numero }),
                    })
                  ).catch(console.error);
                }
              }
            } catch (externalError) {
              console.error('Erro em integrações externas (seguindo encerramento):', conversa.conversa_id, externalError);
            }
          }

          const { error } = await withTimeout(async () =>
            supabase.rpc('encerrar_conversa', {
              p_conversa_id: conversa.conversa_id,
              p_motivo_id: motivoId,
              p_usuario_id: usuarioId,
            })
          );

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
    } finally {
      setIsProcessing(false);
      handleClose();
      onComplete();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md min-h-[280px] flex flex-col">
        {etapa === 1 && (
          <div className="flex flex-col flex-1 justify-between">
            <DialogHeader>
              <DialogTitle>Encerrar {conversas.length} conversa{conversas.length > 1 ? 's' : ''}</DialogTitle>
              <DialogDescription className="text-justify">
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
            <div className="flex justify-center gap-3 pt-4">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handleConfirmarEtapa1}>Confirmar</Button>
            </div>
          </div>
        )}
        {etapa === 2 && (
          <div className="flex flex-col flex-1 justify-between">
            <DialogHeader>
              <DialogTitle>Enviar avaliação de atendimento?</DialogTitle>
              <DialogDescription className="text-justify">
                Deseja enviar a mensagem de avaliação de atendimento para as conversas selecionadas antes de encerrá-las?
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center gap-3 pt-4">
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
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
