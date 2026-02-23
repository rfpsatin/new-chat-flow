import { cn } from '@/lib/utils';

interface ConversaTagsProps {
  /** Origem (webhook envia origem: "web-chat" = bolinha azul, "whatsapp" = bolinha verde) */
  origem?: string | null;
  channel?: string | null;
  className?: string;
}

/**
 * Tag do canal: círculo + texto.
 * - Cor da bolinha: origem = "web-chat" → azul escuro; caso contrário → verde.
 * - Texto: channel (Comercial, Marketing, Fluxo) ou Chat-Web quando origem é web-chat; senão "—" (sem fallback).
 */
export function ConversaTags({ origem, channel, className }: ConversaTagsProps) {
  const normalizedOrigem = (origem ?? '').trim().toLowerCase();

  // Cor da bolinha apenas por origem
  const isWebChat = normalizedOrigem === 'web-chat';

  // Label: channel normalizado (Comercial, Marketing, Fluxo); ou Chat-Web se web-chat; senão "—" (nunca fallback WhatsApp)
  let label: string;
  if (channel === 'Comercial' || channel === 'Marketing' || channel === 'Fluxo') {
    label = channel;
  } else if (isWebChat) {
    label = 'Chat-Web';
  } else {
    label = '—';
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

