import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ConversaTagsProps {
  source?: string | null;
  channel?: string | null;
  className?: string;
}

export function ConversaTags({ source, channel, className }: ConversaTagsProps) {
  const formatSource = (source: string | null | undefined): string | null => {
    if (!source) return null;
    // "web-chat" -> "Web Chat"
    return source
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatChannel = (channel: string | null | undefined): string | null => {
    if (!channel || channel.trim() === '') {
      return null;
    }
    
    const normalized = channel.toLowerCase().trim();
    
    // Normalizar valores conhecidos
    if (normalized === 'comercial') {
      return 'Comercial';
    }
    
    if (normalized === 'mkt' || normalized === 'marketing') {
      return 'Marketing';
    }
    
    if (normalized === 'whatsapp') {
      return 'WhatsApp';
    }
    
    // Se já estiver no formato correto, retornar como está
    // Caso contrário, capitalizar primeira letra
    return channel.charAt(0).toUpperCase() + channel.slice(1).toLowerCase();
  };

  const formattedSource = formatSource(source);
  const formattedChannel = formatChannel(channel);
  
  // Se não houver source nem channel, mostrar WhatsApp (conversas do webhook maia)
  const showWhatsApp = !formattedSource && !formattedChannel;

  return (
    <div className={cn('flex items-center gap-1.5 flex-nowrap', className)}>
      {formattedSource && (
        <Badge variant="outline" className="text-xs shrink-0">
          {formattedSource}
        </Badge>
      )}
      {formattedChannel && (
        <Badge variant="outline" className="text-xs shrink-0">
          {formattedChannel}
        </Badge>
      )}
      {showWhatsApp && (
        <Badge variant="outline" className="text-xs shrink-0">
          WhatsApp
        </Badge>
      )}
    </div>
  );
}

