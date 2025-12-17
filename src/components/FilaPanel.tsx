import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useFila, useAssumirConversa } from '@/hooks/useFila';
import { ConversaItem } from '@/components/ConversaItem';
import { FiltrosFila } from '@/components/FiltrosFila';
import { FilaAtendimento } from '@/types/atendimento';

import { Button } from '@/components/ui/button';
import { Loader2, Inbox, FilterX } from 'lucide-react';
import { toast } from 'sonner';

interface FilaPanelProps {
  onSelectConversa: (conversa: FilaAtendimento) => void;
  selectedConversaId: string | null;
}

export function FilaPanel({ onSelectConversa, selectedConversaId }: FilaPanelProps) {
  const { empresaId, currentUser } = useApp();
  const { data: fila, isLoading } = useFila(empresaId);
  const assumirConversa = useAssumirConversa();

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([
    'bot',
    'esperando_tria',
    'fila_humano',
    'em_atendimento_humano',
  ]);

  // Calculate status counts
  const statusCounts = useMemo(() => {
    return {
      bot: fila?.filter(c => c.status === 'bot').length || 0,
      esperando_tria: fila?.filter(c => c.status === 'esperando_tria').length || 0,
      fila_humano: fila?.filter(c => c.status === 'fila_humano').length || 0,
      em_atendimento_humano: fila?.filter(c => c.status === 'em_atendimento_humano').length || 0,
    };
  }, [fila]);

  // Filter conversations
  const filteredConversas = useMemo(() => {
    if (!fila) return [];

    return fila
      .filter(conversa => {
        // Filter by status
        if (!selectedStatuses.includes(conversa.status || '')) return false;

        // Filter by search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const nome = (conversa.contato_nome || '').toLowerCase();
          const telefone = (conversa.whatsapp_numero || '').toLowerCase();
          if (!nome.includes(query) && !telefone.includes(query)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Sort by last_message_at descending (most recent first)
        const dateA = new Date(a.last_message_at || 0).getTime();
        const dateB = new Date(b.last_message_at || 0).getTime();
        return dateB - dateA;
      });
  }, [fila, selectedStatuses, searchQuery]);

  const handleToggleStatus = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  // Atendente assumes conversation designated to them
  const handleAssumirConversa = async (conversa: FilaAtendimento, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser?.id || !conversa.conversa_id) return;

    try {
      await assumirConversa.mutateAsync({
        conversaId: conversa.conversa_id,
        agenteId: currentUser.id,
      });
      toast.success('Conversa assumida com sucesso');
      onSelectConversa(conversa);
    } catch (error) {
      toast.error('Erro ao assumir conversa');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const totalConversas = fila?.length || 0;

  if (totalConversas === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Inbox className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">Fila vazia</h3>
        <p className="text-sm text-muted-foreground">
          Nenhuma conversa aguardando atendimento
        </p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Filters */}
      <div className="p-4 border-b bg-card">
        <FiltrosFila
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedStatuses={selectedStatuses}
          onToggleStatus={handleToggleStatus}
          statusCounts={statusCounts}
        />
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
              <FilterX className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-foreground mb-1">Nenhuma conversa</h3>
            <p className="text-sm text-muted-foreground">
              {selectedStatuses.length === 0
                ? 'Selecione ao menos um filtro de status'
                : 'Nenhuma conversa corresponde aos filtros'}
            </p>
          </div>
        ) : (
          <div className="py-2 px-2 space-y-1">
            {filteredConversas.map(conversa => {
              // Show "Assumir" button only for fila_humano conversations designated to current user
              const isDesignadoParaMim =
                conversa.status === 'fila_humano' &&
                conversa.agente_responsavel_id === currentUser?.id;

              return (
                <div key={conversa.conversa_id} className="relative group">
                  <ConversaItem
                    conversa={conversa}
                    isSelected={selectedConversaId === conversa.conversa_id}
                    onClick={() => onSelectConversa(conversa)}
                  />
                  {isDesignadoParaMim && (
                    <Button
                      size="sm"
                      variant="default"
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity h-7 text-xs"
                      onClick={(e) => handleAssumirConversa(conversa, e)}
                      disabled={assumirConversa.isPending}
                    >
                      Assumir
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
