import { useApp } from '@/contexts/AppContext';
import { useFila, useAtribuirAgente } from '@/hooks/useFila';
import { ConversaItem } from '@/components/ConversaItem';
import { FilaAtendimento } from '@/types/atendimento';

import { Button } from '@/components/ui/button';
import { Loader2, Inbox, Bot, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface FilaPanelProps {
  onSelectConversa: (conversa: FilaAtendimento) => void;
  selectedConversaId: string | null;
}

export function FilaPanel({ onSelectConversa, selectedConversaId }: FilaPanelProps) {
  const { empresaId, currentUser } = useApp();
  const { data: fila, isLoading } = useFila(empresaId);
  const atribuirAgente = useAtribuirAgente();

  const comBot = fila?.filter(c => c.status === 'bot') || [];
  const aguardandoTriagem = fila?.filter(c => c.status === 'esperando_tria') || [];
  const naFila = fila?.filter(c => c.status === 'fila_humano') || [];
  const emAtendimento = fila?.filter(c => c.status === 'em_atendimento_humano') || [];

  const handleAssumirConversa = async (conversa: FilaAtendimento, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser?.id || !conversa.conversa_id) return;
    
    try {
      await atribuirAgente.mutateAsync({
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

  const renderSection = (
    title: string, 
    conversas: FilaAtendimento[], 
    count: number,
    icon?: React.ReactNode,
    showAssumirButton?: boolean
  ) => {
    if (count === 0) return null;
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {title}
            </h3>
          </div>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {count}
          </span>
        </div>
        <div className="space-y-1 px-2">
          {conversas.map(conversa => (
            <div key={conversa.conversa_id} className="relative group">
              <ConversaItem
                conversa={conversa}
                isSelected={selectedConversaId === conversa.conversa_id}
                onClick={() => onSelectConversa(conversa)}
              />
              {showAssumirButton && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity h-7 text-xs"
                  onClick={(e) => handleAssumirConversa(conversa, e)}
                  disabled={atribuirAgente.isPending}
                >
                  <UserPlus className="w-3 h-3 mr-1" />
                  Assumir
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const totalConversas = (fila?.length || 0);

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
    <div className="absolute inset-0 overflow-y-auto">
      <div className="py-4 space-y-6">
        {renderSection('Com Bot', comBot, comBot.length, <Bot className="w-4 h-4 text-muted-foreground" />, true)}
        {renderSection('Aguardando Triagem', aguardandoTriagem, aguardandoTriagem.length)}
        {renderSection('Na Fila', naFila, naFila.length)}
        {renderSection('Em Atendimento', emAtendimento, emAtendimento.length)}
      </div>
    </div>
  );
}
