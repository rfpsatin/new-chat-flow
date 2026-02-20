import { cn } from '@/lib/utils';

interface ConversaTagsProps {
  source?: string | null;
  channel?: string | null;
  className?: string;
}

/** Círculo azul = Chat-Web; círculo verde = WhatsApp */
export function ConversaTags({ source, channel, className }: ConversaTagsProps) {
  const formatChannel = (channel: string | null | undefined): string | null => {
    if (!channel || channel.trim() === '') {
      return null;
    }

    const normalized = channel.toLowerCase().trim();

    if (normalized === 'comercial') {
      return 'Comercial';
    }
    if (normalized === 'mkt' || normalized === 'marketing') {
      return 'Marketing';
    }
    if (normalized === 'whatsapp') {
      return 'WhatsApp';
    }
    return channel.charAt(0).toUpperCase() + channel.slice(1).toLowerCase();
  };

  const normalizedSource = source?.trim().toLowerCase() || '';
  const formattedChannel = formatChannel(channel);

  let isWebChat: boolean;
  let label: string;
  if (normalizedSource === 'web-chat' && formattedChannel && (formattedChannel === 'Comercial' || formattedChannel === 'Marketing')) {
    isWebChat = true;
    label = formattedChannel;
  } else if (!normalizedSource && formattedChannel === 'WhatsApp') {
    isWebChat = false;
    label = 'Automação';
  } else {
    isWebChat = false;
    label = 'WhatsApp';
  }

  return (
    <div className={cn('flex items-center gap-1.5 flex-nowrap text-xs text-muted-foreground', className)}>
      <span
        className={cn(
          'shrink-0 rounded-full w-2 h-2',
          isWebChat ? 'bg-blue-500' : 'bg-green-500'
        )}
        aria-hidden
      />
      <span className="truncate">{label}</span>
    </div>
  );
}

