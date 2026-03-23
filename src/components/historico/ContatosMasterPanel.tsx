import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, MessageSquare, UserCog, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContatoComHistorico, AtendenteComHistorico, FiltrosHistorico as FiltrosType } from '@/types/atendimento';
import { FiltrosHistorico } from './FiltrosHistorico';

interface Props {
  modo: 'atendentes' | 'contatos';
  atendentes: AtendenteComHistorico[];
  contatos: ContatoComHistorico[];
  isLoading: boolean;
  itemSelecionadoId: string | null;
  onSelectItem: (id: string) => void;
  filtros: FiltrosType;
  onFiltrosChange: (filtros: FiltrosType) => void;
  operadores: { id: string; nome: string }[];
  onAplicar: () => void;
  hasApplied: boolean;
}

export function ContatosMasterPanel({
  modo,
  atendentes,
  contatos,
  isLoading,
  itemSelecionadoId,
  onSelectItem,
  filtros,
  onFiltrosChange,
  operadores,
  onAplicar,
  hasApplied,
}: Props) {
  const isAtendentes = modo === 'atendentes';
  const items = isAtendentes ? atendentes : contatos;

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2">
          {isAtendentes ? (
            <UserCog className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Users className="w-4 h-4 text-muted-foreground" />
          )}
          <h2 className="font-semibold text-sm">
            {isAtendentes ? 'Atendentes' : 'Contatos'}
          </h2>
          <span className="text-xs text-muted-foreground ml-auto">
            {items.length}
          </span>
        </div>
        {isAtendentes && (
          <p className="text-xs text-muted-foreground mt-1">
            Busque para ver contatos
          </p>
        )}
      </div>

      <FiltrosHistorico
        filtros={filtros}
        onFiltrosChange={onFiltrosChange}
        operadores={operadores}
        ocultarOperador={isAtendentes}
        onAplicar={onAplicar}
      />

      <ScrollArea className="flex-1">
        {!hasApplied ? (
          <div className="p-4 text-center">
            <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Defina os filtros e clique em <strong>Consultar</strong>
            </p>
          </div>
        ) : isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Carregando...
          </div>
        ) : items.length === 0 ? (
          <div className="p-4 text-center">
            <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {isAtendentes ? 'Nenhum atendente com histórico' : 'Nenhum contato encontrado'}
            </p>
          </div>
        ) : isAtendentes ? (
          <div className="p-2 space-y-1">
            {atendentes.map((atendente) => (
              <button
                key={atendente.agente_id}
                onClick={() => onSelectItem(atendente.agente_id)}
                className={cn(
                  'w-full p-3 rounded-lg text-left transition-colors',
                  'hover:bg-accent',
                  itemSelecionadoId === atendente.agente_id
                    ? 'bg-accent border border-border'
                    : 'bg-transparent'
                )}
              >
                <div className="font-medium text-sm truncate">
                  {atendente.agente_nome || 'Sem nome'}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">
                    Atendente
                  </span>
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {atendente.total_sessoes} {atendente.total_sessoes === 1 ? 'sessão' : 'sessões'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {contatos.map((contato) => (
              <button
                key={contato.contato_id}
                onClick={() => onSelectItem(contato.contato_id)}
                className={cn(
                  'w-full p-3 rounded-lg text-left transition-colors',
                  'hover:bg-accent',
                  itemSelecionadoId === contato.contato_id
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
