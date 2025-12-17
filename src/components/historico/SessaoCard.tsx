import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { X, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { HistoricoConversa } from '@/types/atendimento';
import { useMensagensHistorico } from '@/hooks/useHistorico';

interface Props {
  sessao: HistoricoConversa;
  onClose: () => void;
}

export function SessaoCard({ sessao, onClose }: Props) {
  const { data: mensagens, isLoading } = useMensagensHistorico(sessao.conversa_id);

  return (
    <div className="flex-1 min-h-0 border border-border rounded-lg bg-card flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="font-medium">
              {format(new Date(sessao.iniciado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            {sessao.agente_nome && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {sessao.agente_nome}
              </span>
            )}
            {sessao.motivo_encerramento && (
              <span className="bg-muted px-1.5 py-0.5 rounded">
                {sessao.motivo_encerramento}
              </span>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Mensagens */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {isLoading ? (
            <div className="text-center text-sm text-muted-foreground py-4">
              Carregando mensagens...
            </div>
          ) : mensagens?.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-4">
              Nenhuma mensagem
            </div>
          ) : (
            mensagens?.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'max-w-[85%] p-2.5 rounded-lg text-sm',
                  msg.direcao === 'in'
                    ? 'bg-muted mr-auto'
                    : 'bg-primary text-primary-foreground ml-auto'
                )}
              >
                {msg.tipo_remetente !== 'cliente' && msg.direcao === 'out' && (
                  <div className="text-xs opacity-70 mb-1">
                    {msg.tipo_remetente === 'bot' ? '🤖 Bot' : '👤 Agente'}
                  </div>
                )}
                <p className="whitespace-pre-wrap break-words">{msg.conteudo}</p>
                <div className="text-xs opacity-70 mt-1 text-right">
                  {format(new Date(msg.criado_em), 'HH:mm', { locale: ptBR })}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
