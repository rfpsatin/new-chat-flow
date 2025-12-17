import { useApp } from '@/contexts/AppContext';
import { useFila } from '@/hooks/useFila';
import { ConversaItem } from '@/components/ConversaItem';
import { FilaAtendimento } from '@/types/atendimento';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Inbox } from 'lucide-react';

interface FilaPanelProps {
  onSelectConversa: (conversa: FilaAtendimento) => void;
  selectedConversaId: string | null;
}

export function FilaPanel({ onSelectConversa, selectedConversaId }: FilaPanelProps) {
  const { empresaId } = useApp();
  const { data: fila, isLoading } = useFila(empresaId);

  const aguardandoTriagem = fila?.filter(c => c.status === 'esperando_tria') || [];
  const naFila = fila?.filter(c => c.status === 'fila_humano') || [];
  const emAtendimento = fila?.filter(c => c.status === 'em_atendimento_humano') || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const renderSection = (title: string, conversas: FilaAtendimento[], count: number) => {
    if (count === 0) return null;
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between px-4 py-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </h3>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {count}
          </span>
        </div>
        <div className="space-y-1 px-2">
          {conversas.map(conversa => (
            <ConversaItem
              key={conversa.conversa_id}
              conversa={conversa}
              isSelected={selectedConversaId === conversa.conversa_id}
              onClick={() => onSelectConversa(conversa)}
            />
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
    <ScrollArea className="h-full">
      <div className="py-4 space-y-6">
        {renderSection('Aguardando Triagem', aguardandoTriagem, aguardandoTriagem.length)}
        {renderSection('Na Fila', naFila, naFila.length)}
        {renderSection('Em Atendimento', emAtendimento, emAtendimento.length)}
      </div>
    </ScrollArea>
  );
}
