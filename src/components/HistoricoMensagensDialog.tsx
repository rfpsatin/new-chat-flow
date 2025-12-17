import { useMensagensHistorico } from '@/hooks/useMensagens';
import { HistoricoConversa } from '@/types/atendimento';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HistoricoMensagensDialogProps {
  conversa: HistoricoConversa;
  onClose: () => void;
}

export function HistoricoMensagensDialog({ conversa, onClose }: HistoricoMensagensDialogProps) {
  const { data: mensagens, isLoading } = useMensagensHistorico(conversa.conversa_id);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Histórico do Atendimento
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {format(new Date(conversa.iniciado_em), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            {conversa.motivo_encerramento && ` • ${conversa.motivo_encerramento}`}
          </p>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-3 py-4">
              {mensagens?.map((msg) => {
                const isOutgoing = msg.direcao === 'out';
                
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex',
                      isOutgoing ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[75%] rounded-2xl px-4 py-2.5',
                        isOutgoing
                          ? 'bg-chat-outgoing text-chat-outgoing-text rounded-br-md'
                          : 'bg-chat-incoming text-foreground rounded-bl-md'
                      )}
                    >
                      {msg.tipo_remetente !== 'cliente' && (
                        <p className={cn(
                          'text-xs font-medium mb-1',
                          isOutgoing ? 'text-chat-outgoing-text/70' : 'text-primary'
                        )}>
                          {msg.tipo_remetente === 'bot' ? 'Bot' : 
                           msg.tipo_remetente === 'agente' ? 'Atendente' : 'Sistema'}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {msg.conteudo}
                      </p>
                      <p className={cn(
                        'text-xs mt-1',
                        isOutgoing ? 'text-chat-outgoing-text/60' : 'text-muted-foreground'
                      )}>
                        {format(new Date(msg.criado_em), 'HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        
        {conversa.resumo && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-foreground mb-1">Resumo:</p>
            <p className="text-sm text-muted-foreground">{conversa.resumo}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
