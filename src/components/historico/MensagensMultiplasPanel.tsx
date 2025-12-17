import { MessageSquare } from 'lucide-react';
import { HistoricoConversa } from '@/types/atendimento';
import { SessaoCard } from './SessaoCard';

interface Props {
  sessoes: HistoricoConversa[];
  onCloseSessao: (conversaId: string) => void;
}

export function MensagensMultiplasPanel({ sessoes, onCloseSessao }: Props) {
  if (sessoes.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-muted/30 text-muted-foreground">
        <MessageSquare className="w-10 h-10 mb-2" />
        <p className="text-sm">Selecione sessões para visualizar</p>
        <p className="text-xs mt-1">Você pode abrir múltiplas sessões</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background p-3 gap-3 overflow-auto">
      {sessoes.map((sessao) => (
        <SessaoCard
          key={sessao.conversa_id}
          sessao={sessao}
          onClose={() => onCloseSessao(sessao.conversa_id)}
        />
      ))}
    </div>
  );
}
