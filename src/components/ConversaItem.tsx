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
  showAgentName?: boolean;
}

export function ConversaItem({ conversa, isSelected, onClick, showBadge = true, showAgentName = true }: ConversaItemProps) {
  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  /**
   * Verifica se a conversa vem do n8n-webhook-cinemkt
   * Retorna true se tem source OU (channel existe E channel !== "WhatsApp")
   */
  const isN8nCinemktConversa = () => {
    const hasSource = !!conversa.source;
    const hasChannel = !!conversa.channel;
    const isWhatsAppChannel = conversa.channel === 'WhatsApp';
    
    return hasSource || (hasChannel && !isWhatsAppChannel);
  };

  /**
   * Verifica se o channel é Marketing ou Comercial
   */
  const isMktOrComercialChannel = () => {
    return conversa.channel === 'Marketing' || conversa.channel === 'Comercial';
  };

  /**
   * Retorna o nome a ser exibido: protocolo se channel mkt/comercial e sem nome, senão o nome
   */
  const getDisplayName = () => {
    const hasName = conversa.contato_nome && conversa.contato_nome !== 'Sem nome';
    
    if (isMktOrComercialChannel() && !hasName) {
      return conversa.nr_protocolo || 'Sem nome';
    }
    
    return conversa.contato_nome || 'Sem nome';
  };

  /**
   * Remove o prefixo "webchat-" do número e retorna apenas o ID
   */
  const formatWebchatId = (numero: string) => {
    if (numero.startsWith('webchat-')) {
      return numero.replace('webchat-', '');
    }
    return numero;
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
        'w-full p-4 text-left rounded-lg transition-all duration-200 min-h-[100px]',
        'hover:bg-accent/50',
        isSelected && 'bg-accent ring-1 ring-primary/20'
      )}
    >
      <div className="flex items-start gap-3 h-full">
        <Avatar className="h-11 w-11 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {getInitials(getDisplayName())}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-foreground truncate">
              {getDisplayName()}
            </span>
            <span className="text-xs text-muted-foreground shrink-0">
              {timeAgo}
            </span>
          </div>
          
          {/* Layout diferente para admin/supervisor vs operador */}
          {showAgentName ? (
            <>
              {/* Linha do telefone/id com tag de canal à direita */}
              {isN8nCinemktConversa() ? (
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>id: {formatWebchatId(conversa.whatsapp_numero)}</span>
                  <ConversaTags source={conversa.source} channel={conversa.channel} />
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3" />
                    <span>{formatPhone(conversa.whatsapp_numero)}</span>
                  </div>
                  <ConversaTags source={conversa.source} channel={conversa.channel} />
                </div>
              )}
              
              {/* Linha abaixo: Atendente à esquerda, Status à direita (alinhado com tag de canal) */}
              <div className="flex items-center justify-between gap-2 pt-1.5">
                {conversa.agente_nome ? (
                  <span className="text-xs text-muted-foreground truncate">
                    Atendente: {conversa.agente_nome}
                  </span>
                ) : (
                  <span></span>
                )}
                {showBadge && (
                  <StatusBadge status={conversa.status} />
                )}
              </div>
            </>
          ) : (
            <>
              {/* Layout para operador: manter como estava */}
              {isN8nCinemktConversa() ? (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>id: {formatWebchatId(conversa.whatsapp_numero)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="w-3 h-3" />
                  <span>{formatPhone(conversa.whatsapp_numero)}</span>
                </div>
              )}
              
              {/* Tag de channel abaixo do telefone e status na mesma linha alinhado à direita */}
              <div className="flex items-center justify-between gap-2">
                <ConversaTags source={conversa.source} channel={conversa.channel} />
                {showBadge && (
                  <StatusBadge status={conversa.status} />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </button>
  );
}
