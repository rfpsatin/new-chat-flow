import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ConversaTagsProps {
  source?: string | null;
  channel?: string | null;
  className?: string;
}

export function ConversaTags({ source, channel, className }: ConversaTagsProps) {
  // Se não houver nenhuma etiqueta, não renderiza nada
  if (!source && !channel) {
    return null;
  }

  const formatSource = (source: string | null | undefined): string | null => {
    if (!source) return null;
    // "web-chat" -> "Web Chat"
    return source
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatChannel = (channel: string | null | undefined): string | null => {
    if (!channel) return null;
    // Os valores já vêm normalizados do banco (Comercial, Marketing, WhatsApp)
    // Apenas retorna o valor como está
    return channel;
  };

  const formattedSource = formatSource(source);
  const formattedChannel = formatChannel(channel);

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
    </div>
  );
}

