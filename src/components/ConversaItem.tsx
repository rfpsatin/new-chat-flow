import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FilaAtendimento, StatusConversa } from '@/types/atendimento';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConversaTags } from '@/components/ConversaTags';

interface ConversaItemProps {
  conversa: FilaAtendimento;
  isSelected: boolean;
  onClick: () => void;
  /** Tipo de atendimento da empresa (Marketing/Comercial) para o rótulo da tag */
  tipoAtendimentoEmpresa?: string | null;
  showBadge?: boolean;
  showAgentName?: boolean;
  selectionMode?: boolean;
  isChecked?: boolean;
  onToggleCheck?: () => void;
}

export function ConversaItem({ conversa, isSelected, onClick, tipoAtendimentoEmpresa, showBadge = true, showAgentName = true, selectionMode = false, isChecked = false, onToggleCheck }: ConversaItemProps) {
  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  /**
   * Verifica se a conversa vem do n8n-webhook-cinemkt
   * Retorna true se tem origem OU (channel existe E channel !== "WhatsApp")
   */
  const isN8nCinemktConversa = () => {
    const hasOrigem = !!conversa.origem;
    const hasChannel = !!conversa.channel;
    const isWhatsAppChannel = conversa.channel === 'WhatsApp';
    
    return hasOrigem || (hasChannel && !isWhatsAppChannel);
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

  const statusLabel: Record<StatusConversa, string> = {
    bot: 'Bot',
    esperando_tria: 'Triagem',
    fila_humano: 'Em fila',
    em_atendimento_humano: 'Atendimento',
    encerrado: 'Encerrado',
  };
  const showAgentNameInStatus =
    showAgentName &&
    (conversa.status === 'fila_humano' || conversa.status === 'em_atendimento_humano') &&
    !!conversa.agente_nome;
  const primeiroNome = conversa.agente_nome?.split(/\s+/)[0] ?? '';

  const handleClick = () => {
    if (selectionMode && onToggleCheck) {
      onToggleCheck();
    } else {
      onClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full p-4 text-left rounded-lg transition-all duration-200 min-h-[100px]',
        'hover:bg-accent/50',
        isSelected && !selectionMode && 'bg-accent ring-1 ring-primary/20',
        selectionMode && isChecked && 'bg-primary/5 ring-1 ring-primary/30'
      )}
    >
      <div className="flex items-start gap-3 h-full">
        {selectionMode && (
          <div className="flex items-center shrink-0 pt-1">
            <div
              className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                isChecked
                  ? 'bg-primary border-primary'
                  : 'border-muted-foreground/40'
              )}
            >
              {isChecked && (
                <svg className="w-3 h-3 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </div>
        )}
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
          </div>

          {/* Telefone ou id */}
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
        </div>

        {/* Canto superior direito: tempo; canto inferior direito: tag + |Status| Nome */}
        <div className="flex flex-col items-end justify-between gap-1 shrink-0 min-h-[52px]">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {timeAgo}
          </span>
          <div className="flex flex-col items-end gap-0.5">
            <ConversaTags origem={conversa.origem} tipoAtendimentoEmpresa={tipoAtendimentoEmpresa} channel={conversa.channel} />
            {showBadge && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap justify-end">
                <span>| {statusLabel[conversa.status]} |</span>
                {showAgentNameInStatus && primeiroNome && (
                  <span className="truncate max-w-[80px]" title={conversa.agente_nome ?? undefined}>
                    {primeiroNome}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
