import { cn } from '@/lib/utils';

interface ConversaTagsProps {
  /** Origem (web-chat = bolinha azul, demais = bolinha verde) */
  origem?: string | null;
  /** Tipo de atendimento da empresa (Marketing ou Comercial) – vem do cadastro da empresa */
  tipoAtendimentoEmpresa?: string | null;
  /** @deprecated Mantido por compatibilidade; o rótulo passa a vir de tipoAtendimentoEmpresa */
  channel?: string | null;
  className?: string;
}

/**
 * Tag do canal: círculo + texto.
 * - Cor da bolinha: origem = "web-chat" → azul (chat web); caso contrário → verde (WhatsApp).
 * - Texto: quando tipoAtendimentoEmpresa é informado (cadastro da empresa), exibe Marketing ou Comercial; senão fallback por channel/origem.
 */
export function ConversaTags({ origem, tipoAtendimentoEmpresa, channel, className }: ConversaTagsProps) {
  const normalizedOrigem = (origem ?? '').trim().toLowerCase();
  const isWebChat = normalizedOrigem === 'web-chat';

  const normalizedTipo = (tipoAtendimentoEmpresa ?? '').trim().toLowerCase();
  const normalizedChannel = (channel ?? '').trim().toLowerCase();

  let label: string;
  if (normalizedTipo === 'marketing') {
    label = 'Marketing';
  } else if (normalizedTipo === 'comercial') {
    label = 'Comercial';
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

