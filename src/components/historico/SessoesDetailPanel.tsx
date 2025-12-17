import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { FolderOpen, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { HistoricoConversa, ContatoComHistorico } from '@/types/atendimento';

interface Props {
  contato: ContatoComHistorico | null;
  sessoes: HistoricoConversa[];
  isLoading: boolean;
  sessoesAbertas: string[];
  onToggleSessao: (conversaId: string) => void;
}

export function SessoesDetailPanel({
  contato,
  sessoes,
  isLoading,
  sessoesAbertas,
  onToggleSessao,
}: Props) {
  if (!contato) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-muted/30 text-muted-foreground">
        <FolderOpen className="w-10 h-10 mb-2" />
        <p className="text-sm">Selecione um contato</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Sessões</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-1 truncate">
          {contato.contato_nome || contato.whatsapp_numero}
        </p>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Carregando sessões...
          </div>
        ) : sessoes.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Nenhuma sessão encontrada
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {sessoes.map((sessao) => {
              const isAberta = sessoesAbertas.includes(sessao.conversa_id);
              
              return (
                <div
                  key={sessao.conversa_id}
                  className={cn(
                    'p-3 rounded-lg border transition-colors cursor-pointer',
                    isAberta
                      ? 'bg-primary/10 border-primary/30'
                      : 'bg-card border-border hover:bg-accent'
                  )}
                  onClick={() => onToggleSessao(sessao.conversa_id)}
                >
                  <div className="flex items-start gap-2">
                    <Checkbox
                      checked={isAberta}
                      className="mt-0.5"
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={() => onToggleSessao(sessao.conversa_id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>
                          {format(new Date(sessao.iniciado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      
                      {sessao.encerrado_em && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Encerrado: {format(new Date(sessao.encerrado_em), 'HH:mm', { locale: ptBR })}
                        </div>
                      )}

                      {sessao.agente_nome && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <User className="w-3 h-3" />
                          <span>{sessao.agente_nome}</span>
                        </div>
                      )}

                      {sessao.motivo_encerramento && (
                        <span className="inline-block text-xs bg-muted px-2 py-0.5 rounded mt-2">
                          {sessao.motivo_encerramento}
                        </span>
                      )}

                      {sessao.resumo && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {sessao.resumo}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
