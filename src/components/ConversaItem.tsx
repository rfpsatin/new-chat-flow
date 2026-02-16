import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FilaAtendimento } from '@/types/atendimento';
import { StatusBadge } from '@/components/StatusBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConversaTags } from '@/components/ConversaTags';

interface ConversaItemProps {
  conversa: FilaAtendimento;
  isSelected: boolean;
  onClick: () => void;
  showBadge?: boolean;
}

export function ConversaItem({ conversa, isSelected, onClick, showBadge = true }: ConversaItemProps) {
  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    return phone;
  };

  const timeAgo = formatDistanceToNow(new Date(conversa.last_message_at), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-4 text-left rounded-lg transition-all duration-200',
        'hover:bg-accent/50',
        isSelected && 'bg-accent ring-1 ring-primary/20'
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-11 w-11 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {getInitials(conversa.contato_nome)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-foreground truncate">
              {conversa.contato_nome || 'Sem nome'}
            </span>
            <span className="text-xs text-muted-foreground shrink-0">
              {timeAgo}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="w-3 h-3" />
            <span>{formatPhone(conversa.whatsapp_numero)}</span>
          </div>
          
          {/* Etiquetas source e channel */}
          <ConversaTags source={conversa.source} channel={conversa.channel} />
          
          <div className="flex items-center justify-between gap-2 pt-1">
            {showBadge && <StatusBadge status={conversa.status} />}
            {conversa.agente_nome && (
              <span className="text-xs text-muted-foreground truncate">
                {conversa.agente_nome}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
