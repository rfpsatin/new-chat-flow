import { StatusConversa } from '@/types/atendimento';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: StatusConversa;
  className?: string;
}

const statusConfig: Record<StatusConversa, { label: string; dotColor: string }> = {
  bot: {
    label: 'Bot',
    dotColor: 'bg-muted-foreground',
  },
  esperando_tria: {
    label: 'Triagem',
    dotColor: 'bg-muted-foreground',
  },
  fila_humano: {
    label: 'Na Fila',
    dotColor: 'bg-muted-foreground',
  },
  em_atendimento_humano: {
    label: 'Em atendimento',
    dotColor: 'bg-green-500',
  },
  encerrado: {
    label: 'Encerrado',
    dotColor: 'bg-muted-foreground',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs text-muted-foreground',
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dotColor)} />
      {config.label}
    </span>
  );
}
