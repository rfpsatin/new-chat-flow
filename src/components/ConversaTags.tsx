import { cn } from '@/lib/utils';

interface ConversaTagsProps {
  /** Origem (webhook envia source ou chat_name); "web-chat" = Chat-Web (círculo azul) */
  source?: string | null;
  channel?: string | null;
  className?: string;
}

/**
 * Tag do canal: círculo + texto.
 * - source/chat_name = "web-chat" → círculo azul escuro; texto = Marketing ou Comercial (conforme channel).
 * - Sem source → círculo verde escuro; texto = WhatsApp.
 */
export function ConversaTags({ source, channel, className }: ConversaTagsProps) {
  const normalizedSource = (source ?? '').trim().toLowerCase();
  const isWebChat = normalizedSource === 'web-chat';

  const normalizedChannel = (channel ?? '').trim().toLowerCase();
  let label: string;
  if (isWebChat) {
    if (normalizedChannel === 'mkt' || normalizedChannel === 'marketing') {
      label = 'Marketing';
    } else if (normalizedChannel === 'comercial') {
      label = 'Comercial';
    } else {
      label = 'Chat-Web';
    }
  } else {
    label = 'WhatsApp';
  }

  return (
    <div className={cn('flex items-center gap-1.5 flex-nowrap text-xs text-muted-foreground', className)}>
      <span
        className={cn(
          'shrink-0 rounded-full w-2 h-2',
          isWebChat ? 'bg-blue-700' : 'bg-green-700'
        )}
        aria-hidden
      />
      <span className="truncate">{label}</span>
    </div>
  );
}

