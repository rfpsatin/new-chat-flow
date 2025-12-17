import { StatusConversa } from '@/types/atendimento';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: StatusConversa;
  className?: string;
}

const statusConfig: Record<StatusConversa, { label: string; bgClass: string; textClass: string }> = {
  bot: {
    label: 'Bot',
    bgClass: 'bg-status-bot-bg',
    textClass: 'text-status-bot',
  },
  esperando_tria: {
    label: 'Aguardando Triagem',
    bgClass: 'bg-status-waiting-bg',
    textClass: 'text-status-waiting',
  },
  fila_humano: {
    label: 'Na Fila',
    bgClass: 'bg-status-queue-bg',
    textClass: 'text-status-queue',
  },
  em_atendimento_humano: {
    label: 'Em Atendimento',
    bgClass: 'bg-status-active-bg',
    textClass: 'text-status-active',
  },
  encerrado: {
    label: 'Encerrado',
    bgClass: 'bg-status-closed-bg',
    textClass: 'text-status-closed',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.bgClass,
        config.textClass,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5', `bg-current`)} />
      {config.label}
    </span>
  );
}
