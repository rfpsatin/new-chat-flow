import { cn } from '@/lib/utils';

interface ConversaTagsProps {
  /** Origem (webhook envia origem: "web-chat" = bolinha azul, "whatsapp" = bolinha verde) */
  origem?: string | null;
  channel?: string | null;
  /** Quem iniciou a sessão (atendente/campanha → tag "Marketing do WhatsApp") */
  origem_inicial?: string | null;
  className?: string;
}

/**
 * Tag do canal: círculo + texto.
 * - origem_inicial atendente ou campanha → "Marketing do WhatsApp" (bolinha verde).
 * - Cor da bolinha: origem = "web-chat" → azul escuro; caso contrário → verde.
 * - Texto: channel (Comercial, Marketing, Fluxo) ou Chat-Web quando origem é web-chat; senão "WhatsApp".
 */
export function ConversaTags({ origem, channel, origem_inicial, className }: ConversaTagsProps) {
  const normalizedOrigem = (origem ?? '').trim().toLowerCase();
  const normalizedOrigemInicial = (origem_inicial ?? '').trim().toLowerCase();

  const isWebChat = normalizedOrigem === 'web-chat';
  const isMarketingWhatsApp = normalizedOrigemInicial === 'atendente' || normalizedOrigemInicial === 'campanha';

  const normalizedChannel = (channel ?? '').trim().toLowerCase();
  let label: string;
  if (isMarketingWhatsApp) {
    label = 'Marketing do WhatsApp';
  } else if (normalizedChannel === 'comercial') {
    label = 'Comercial';
  } else if (normalizedChannel === 'mkt' || normalizedChannel === 'marketing') {
    label = 'Marketing';
  } else if (normalizedChannel === 'fluxo') {
    label = 'Fluxo';
  } else if (isWebChat) {
    label = 'Chat-Web';
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

