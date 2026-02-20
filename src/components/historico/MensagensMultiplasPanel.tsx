import { MessageSquare, FolderOpen, Clock, User, Phone } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { HistoricoConversa, ContatoComHistorico, AtendenteComHistorico } from '@/types/atendimento';
import { SessaoCard } from './SessaoCard';
import { SatisfacaoStars } from './SatisfacaoStars';

interface Props {
  modo: 'atendentes' | 'contatos';
  atendente: AtendenteComHistorico | null;
  contato: ContatoComHistorico | null;
  sessoes: HistoricoConversa[];
  isLoading: boolean;
  sessoesAbertas: string[];
  onToggleSessao: (conversaId: string) => void;
  onCloseSessao: (conversaId: string) => void;
}

export function MensagensMultiplasPanel({
  modo,
  atendente,
  contato,
  sessoes,
  isLoading,
  sessoesAbertas,
  onToggleSessao,
  onCloseSessao,
}: Props) {
  const isAtendentes = modo === 'atendentes';
  const temSelecao = isAtendentes ? !!atendente : !!contato;
  const sessoesAbertasObjetos = sessoes.filter(s => sessoesAbertas.includes(s.conversa_id));

  // Se não há seleção, não mostrar nada
  if (!temSelecao) {
    return null;
  }

  // Se há sessões abertas, mostrar os cards de mensagens
  if (sessoesAbertasObjetos.length > 0) {
    return (
      <div className="h-full flex flex-col bg-background p-3 gap-3 overflow-auto">
        {sessoesAbertasObjetos.map((sessao) => (
          <SessaoCard
            key={sessao.conversa_id}
            sessao={sessao}
            onClose={() => onCloseSessao(sessao.conversa_id)}
          />
        ))}
      </div>
    );
  }

  // Se há seleção mas nenhuma sessão aberta, mostrar lista de sessões disponíveis
  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Sessões</h2>
        </div>
        {isAtendentes && atendente ? (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            Atendidas por: {atendente.agente_nome || 'Sem nome'}
          </p>
        ) : contato ? (
          <div className="mt-1">
            <p className="text-xs font-medium truncate">
              {contato.contato_nome || 'Sem nome'}
            </p>
            {contato.whatsapp_numero && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {contato.whatsapp_numero}
              </p>
            )}
          </div>
        ) : null}
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

                      {/* Mostrar nome do cliente quando em modo atendentes */}
                      {isAtendentes && sessao.contato_nome && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <User className="w-3 h-3" />
                          <span>{sessao.contato_nome}</span>
                        </div>
                      )}

                      {/* Mostrar nome do agente quando em modo contatos */}
                      {!isAtendentes && sessao.agente_nome && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <User className="w-3 h-3" />
                          <span>{sessao.agente_nome}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {sessao.motivo_encerramento && (
                          <span className="inline-block text-xs bg-muted px-2 py-0.5 rounded">
                            {sessao.motivo_encerramento}
                          </span>
                        )}
                        <SatisfacaoStars nota={sessao.nota_satisfacao} />
                      </div>

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
