import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FilaAtendimento } from '@/types/atendimento';
import { useAtendentes } from '@/hooks/useAtendentes';

interface MoverEmLoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversas: FilaAtendimento[];
  onComplete: () => void;
}

type Destino = 'triagem' | 'atendimento_humano' | null;

export function MoverEmLoteDialog({
  open,
  onOpenChange,
  conversas,
  onComplete,
}: MoverEmLoteDialogProps) {
  const [etapa, setEtapa] = useState<1 | 2>(1);
  const [destino, setDestino] = useState<Destino>(null);
  const [atendenteId, setAtendenteId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();
  const { atendentes } = useAtendentes();

  const atendentesAtivos = atendentes?.filter(a => a.ativo) ?? [];

  const handleClose = () => {
    setEtapa(1);
    setDestino(null);
    setAtendenteId('');
    onOpenChange(false);
  };

  const handleSelecionarDestino = (d: Destino) => {
    setDestino(d);
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

  const executarMover = async () => {
    setIsProcessing(true);
    let sucesso = 0;
    let erros = 0;

    try {
      for (const conversa of conversas) {
        try {
          if (!conversa.conversa_id) {
            erros++;
            continue;
          }

          if (destino === 'triagem') {
            const { error } = await withTimeout(async () =>
              supabase.rpc('forcar_atendimento_humano', {
                p_conversa_id: conversa.conversa_id,
              })
            );
            if (error) throw error;
          } else if (destino === 'atendimento_humano') {
            if (conversa.status === 'esperando_tria') {
              const { error } = await withTimeout(async () =>
                supabase.rpc('encaminhar_para_atendente', {
                  p_conversa_id: conversa.conversa_id,
                  p_agente_id: atendenteId,
                })
              );
              if (error) throw error;
            } else {
              const { error } = await withTimeout(async () =>
                supabase.rpc('atribuir_agente', {
                  p_conversa_id: conversa.conversa_id,
                  p_agente_id: atendenteId,
                })
              );
              if (error) throw error;
            }
          }
          sucesso++;
        } catch (err) {
          console.error('Erro ao mover conversa:', conversa.conversa_id, err);
          erros++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['fila'] });

      if (erros === 0) {
        toast.success(`${sucesso} conversa${sucesso > 1 ? 's' : ''} movida${sucesso > 1 ? 's' : ''} com sucesso`);
      } else {
        toast.warning(`${sucesso} movida${sucesso > 1 ? 's' : ''}, ${erros} com erro`);
      }
    } finally {
      setIsProcessing(false);
      handleClose();
      onComplete();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md flex flex-col">
        {etapa === 1 && (
          <div className="flex flex-col flex-1 items-center justify-center gap-6 text-center min-h-[280px] transition-all duration-200">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl">
                Mover {conversas.length} conversa{conversas.length > 1 ? 's' : ''}
              </DialogTitle>
              <DialogDescription className="max-w-md">
                Para qual destino deseja mover as conversas selecionadas?
              </DialogDescription>
            </DialogHeader>
            <div className="w-full max-w-sm flex flex-col gap-3">
              <Button
                variant="outline"
                className="justify-center h-12"
                onClick={() => handleSelecionarDestino('triagem')}
              >
                🔄 Triagem
              </Button>
              <Button
                variant="outline"
                className="justify-center h-12"
                onClick={() => handleSelecionarDestino('atendimento_humano')}
              >
                👤 Atendimento Humano
              </Button>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {etapa === 2 && destino === 'triagem' && (
          <div className="flex flex-col flex-1 items-center justify-center gap-6 text-center min-h-[220px] transition-all duration-200">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl">
                Confirmar mover para Triagem
              </DialogTitle>
              <DialogDescription className="max-w-md">
                As {conversas.length} conversa{conversas.length > 1 ? 's' : ''} selecionadas serão movidas para o filtro Triagem.
                Apenas conversas com status &quot;Bot&quot; serão movidas.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center gap-3 pt-2">
              <Button variant="outline" onClick={() => setEtapa(1)}>
                Voltar
              </Button>
              <Button onClick={executarMover} disabled={isProcessing}>
                {isProcessing && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Confirmar
              </Button>
            </div>
          </div>
        )}

        {etapa === 2 && destino === 'atendimento_humano' && (
          <div className="flex flex-col flex-1 items-center justify-center gap-6 text-center min-h-[220px] transition-all duration-200">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl">
                Mover para Atendimento Humano
              </DialogTitle>
              <DialogDescription className="max-w-md">
                Selecione o atendente que receberá as {conversas.length} conversa{conversas.length > 1 ? 's' : ''}.
              </DialogDescription>
            </DialogHeader>
            <div className="w-full max-w-sm space-y-3">
              <label className="text-sm font-medium text-left">Atendente</label>
              <Select value={atendenteId} onValueChange={setAtendenteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um atendente..." />
                </SelectTrigger>
                <SelectContent>
                  {atendentesAtivos.map((a) => (
                    <SelectItem key={a.id} value={a.usuario_id}>
                      {a.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <Button variant="outline" onClick={() => setEtapa(1)}>
                Voltar
              </Button>
              <Button onClick={executarMover} disabled={isProcessing || !atendenteId}>
                {isProcessing && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Confirmar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
