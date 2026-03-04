import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useFila, useAssumirConversa } from '@/hooks/useFila';
import { ConversaItem } from '@/components/ConversaItem';
import { FiltrosFila } from '@/components/FiltrosFila';
import { SelecaoMultiplaActions } from '@/components/fila/SelecaoMultiplaActions';
import { EncerrarEmLoteDialog } from '@/components/fila/EncerrarEmLoteDialog';
import { MoverEmLoteDialog } from '@/components/fila/MoverEmLoteDialog';
import { FilaAtendimento } from '@/types/atendimento';

import { Button } from '@/components/ui/button';
import { Loader2, Inbox, FilterX } from 'lucide-react';
import { toast } from 'sonner';

interface FilaPanelProps {
  onSelectConversa: (conversa: FilaAtendimento | null) => void;
  selectedConversaId: string | null;
  openConversaId?: string | null;
}

export function FilaPanel({ onSelectConversa, selectedConversaId, openConversaId }: FilaPanelProps) {
  const { empresaId, currentUser } = useApp();
  const { data: fila, isLoading } = useFila(empresaId);
  const assumirConversa = useAssumirConversa();
  

  useEffect(() => {
    if (!openConversaId || !fila?.length) return;
    const c = fila.find((f) => f.conversa_id === openConversaId);
    if (c) onSelectConversa(c);
  }, [openConversaId, fila, onSelectConversa]);

  // Sincronizar conversa selecionada quando a fila atualiza (ex: mudanca de status via realtime)
  // Quando a conversa sai da fila (ex: encerrada), limpa a selecao automaticamente.
  const prevSnapshotRef = useRef('');
  useEffect(() => {
    if (!selectedConversaId || !fila) return;
    const updated = fila.find((f) => f.conversa_id === selectedConversaId);
    if (!updated) {
      prevSnapshotRef.current = '';
      onSelectConversa(null);
      return;
    }
    const snapshot = `${updated.status}|${updated.agente_responsavel_id}|${updated.last_message_at}`;
    if (snapshot !== prevSnapshotRef.current) {
      prevSnapshotRef.current = snapshot;
      onSelectConversa(updated);
    }
  }, [fila, selectedConversaId, onSelectConversa]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('todos');

  // Selection mode states
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showEncerrarDialog, setShowEncerrarDialog] = useState(false);
  const [showMoverDialog, setShowMoverDialog] = useState(false);

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(prev => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  }, []);

  const toggleSelectId = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  // Filtra conversas visíveis baseado no perfil do usuário
  const conversasVisiveis = useMemo(() => {
    if (!fila) return [];
    
    // Operadores veem apenas suas próprias conversas (fila_humano + em_atendimento_humano)
    if (currentUser?.tipo_usuario === 'opr') {
      return fila.filter(conversa => 
        conversa.agente_responsavel_id === currentUser.id &&
        (conversa.status === 'fila_humano' || conversa.status === 'em_atendimento_humano')
      );
    }
    
    // Supervisores e Admins veem tudo
    return fila;
  }, [fila, currentUser]);

  // Calculate status counts (apenas das conversas visíveis do operador, sem bot/triagem)
  const statusCounts = useMemo(() => {
    if (currentUser?.tipo_usuario === 'opr') {
      return {
        bot: 0,
        esperando_tria: 0,
        fila_humano: conversasVisiveis.filter(c => c.status === 'fila_humano').length,
        em_atendimento_humano: conversasVisiveis.filter(c => c.status === 'em_atendimento_humano').length,
      };
    }
    return {
      bot: conversasVisiveis.filter(c => c.status === 'bot').length,
      esperando_tria: conversasVisiveis.filter(c => c.status === 'esperando_tria').length,
      fila_humano: conversasVisiveis.filter(c => c.status === 'fila_humano').length,
      em_atendimento_humano: conversasVisiveis.filter(c => c.status === 'em_atendimento_humano').length,
    };
  }, [conversasVisiveis, currentUser]);

  // Calculate status counts de TODAS as conversas (não filtradas por visibilidade)
  // Usado para mostrar quantidades discretas para operadores
  const allStatusCounts = useMemo(() => {
    if (!fila) {
      return {
        bot: 0,
        esperando_tria: 0,
        fila_humano: 0,
        em_atendimento_humano: 0,
      };
    }
    return {
      bot: fila.filter(c => c.status === 'bot').length,
      esperando_tria: fila.filter(c => c.status === 'esperando_tria').length,
      fila_humano: fila.filter(c => c.status === 'fila_humano').length,
      em_atendimento_humano: fila.filter(c => c.status === 'em_atendimento_humano').length,
    };
  }, [fila]);

  // Filter conversations
  const filteredConversas = useMemo(() => {
    return conversasVisiveis
      .filter(conversa => {
        // Filter by status
        if (selectedStatus !== 'todos' && conversa.status !== selectedStatus) return false;

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
        const dateA = new Date(a.last_message_at || 0).getTime();
        const dateB = new Date(b.last_message_at || 0).getTime();
        return dateB - dateA;
      });
  }, [conversasVisiveis, selectedStatus, searchQuery]);

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

  const totalConversas = conversasVisiveis.length;

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
          selectedStatus={selectedStatus}
          onSelectStatus={setSelectedStatus}
          statusCounts={statusCounts}
          tipoUsuario={currentUser?.tipo_usuario}
          allStatusCounts={allStatusCounts}
          isSelectionMode={selectionMode}
          onToggleSelectionMode={toggleSelectionMode}
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
              Nenhuma conversa corresponde aos filtros
            </p>
          </div>
        ) : (
          <div className="py-2 px-2">
            {filteredConversas.map((conversa, index) => {
              // Show "Assumir" button only for fila_humano conversations designated to current user
              const isDesignadoParaMim =
                conversa.status === 'fila_humano' &&
                conversa.agente_responsavel_id === currentUser?.id;
              const isLast = index === filteredConversas.length - 1;

              return (
                <div key={conversa.conversa_id} className="relative group">
                  <div className={!isLast ? 'border-b border-border/40' : ''}>
                    <ConversaItem
                      conversa={conversa}
                      isSelected={selectedConversaId === conversa.conversa_id}
                      onClick={() => onSelectConversa(conversa)}
                      showBadge={selectedStatus === 'todos'}
                      showAgentName={currentUser?.tipo_usuario !== 'opr'}
                      selectionMode={selectionMode}
                      isChecked={selectedIds.has(conversa.conversa_id!)}
                      onToggleCheck={() => toggleSelectId(conversa.conversa_id!)}
                    />
                  </div>
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

      {/* Selection actions bar - bottom */}
      {selectionMode && (
        <SelecaoMultiplaActions
          selectedCount={selectedIds.size}
          onEncerrar={() => setShowEncerrarDialog(true)}
          onMover={() => setShowMoverDialog(true)}
          onCancelar={exitSelectionMode}
        />
      )}

      {/* Dialogs */}
      <EncerrarEmLoteDialog
        open={showEncerrarDialog}
        onOpenChange={setShowEncerrarDialog}
        conversas={filteredConversas.filter(c => selectedIds.has(c.conversa_id!))}
        empresaId={empresaId!}
        usuarioId={currentUser?.id || ''}
        onComplete={exitSelectionMode}
      />
      <MoverEmLoteDialog
        open={showMoverDialog}
        onOpenChange={setShowMoverDialog}
        conversas={filteredConversas.filter(c => selectedIds.has(c.conversa_id!))}
        onComplete={exitSelectionMode}
      />
    </div>
  );
}
