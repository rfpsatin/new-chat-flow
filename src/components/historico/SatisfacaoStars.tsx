import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SatisfacaoStarsProps {
  nota: number | null;
  size?: 'sm' | 'md';
}

export function SatisfacaoStars({ nota, size = 'sm' }: SatisfacaoStarsProps) {
  if (!nota) {
    return <span className="text-muted-foreground text-xs">Sem avaliação</span>;
  }

  const starSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            starSize,
            n <= nota
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-muted-foreground/30'
          )}
        />
      ))}
    </div>
  );
}
