import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContatoComHistorico, FiltrosHistorico as FiltrosType } from '@/types/atendimento';
import { FiltrosHistorico } from './FiltrosHistorico';

interface Props {
  contatos: ContatoComHistorico[];
  isLoading: boolean;
  contatoSelecionadoId: string | null;
  onSelectContato: (contatoId: string) => void;
  filtros: FiltrosType;
  onFiltrosChange: (filtros: FiltrosType) => void;
  operadores: { id: string; nome: string }[];
}

export function ContatosMasterPanel({
  contatos,
  isLoading,
  contatoSelecionadoId,
  onSelectContato,
  filtros,
  onFiltrosChange,
  operadores,
}: Props) {
  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Contatos</h2>
          <span className="text-xs text-muted-foreground ml-auto">
            {contatos.length}
          </span>
        </div>
      </div>

      <FiltrosHistorico
        filtros={filtros}
        onFiltrosChange={onFiltrosChange}
        operadores={operadores}
      />

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Carregando...
          </div>
        ) : contatos.length === 0 ? (
          <div className="p-4 text-center">
            <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhum contato encontrado
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {contatos.map((contato) => (
              <button
                key={contato.contato_id}
                onClick={() => onSelectContato(contato.contato_id)}
                className={cn(
                  'w-full p-3 rounded-lg text-left transition-colors',
                  'hover:bg-accent',
                  contatoSelecionadoId === contato.contato_id
                    ? 'bg-accent border border-border'
                    : 'bg-transparent'
                )}
              >
                <div className="font-medium text-sm truncate">
                  {contato.contato_nome || 'Sem nome'}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">
                    {contato.whatsapp_numero}
                  </span>
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {contato.total_sessoes} {contato.total_sessoes === 1 ? 'sessão' : 'sessões'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
