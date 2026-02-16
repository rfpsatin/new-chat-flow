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
    // "mkt" -> "Mkt", "comercial" -> "Comercial"
    return channel.charAt(0).toUpperCase() + channel.slice(1);
  };

  const formattedSource = formatSource(source);
  const formattedChannel = formatChannel(channel);

  return (
    <div className={cn('flex items-center gap-1.5 flex-wrap', className)}>
      {formattedSource && (
        <Badge variant="outline" className="text-xs">
          {formattedSource}
        </Badge>
      )}
      {formattedChannel && (
        <Badge variant="outline" className="text-xs">
          {formattedChannel}
        </Badge>
      )}
    </div>
  );
}

