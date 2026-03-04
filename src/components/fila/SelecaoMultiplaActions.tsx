import { X, XCircle, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SelecaoMultiplaActionsProps {
  selectedCount: number;
  onEncerrar: () => void;
  onMover: () => void;
  onCancelar: () => void;
}

export function SelecaoMultiplaActions({
  selectedCount,
  onEncerrar,
  onMover,
  onCancelar,
}: SelecaoMultiplaActionsProps) {
  const hasSelection = selectedCount > 0;

  return (
    <div className="flex items-center justify-center gap-3 px-4 py-2 border-t bg-muted/30">
      <Button variant="ghost" size="sm" onClick={onCancelar} className="h-7 px-2">
        <X className="w-3.5 h-3.5" />
      </Button>
      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
        {selectedCount} conversa{selectedCount !== 1 ? 's' : ''}
      </span>
      <Button
        variant="destructive"
        size="sm"
        disabled={!hasSelection}
        onClick={onEncerrar}
        className="h-7 text-xs"
      >
        <XCircle className="w-3.5 h-3.5 mr-1" />
        Encerrar
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={!hasSelection}
        onClick={onMover}
        className="h-7 text-xs"
      >
        <ArrowRightLeft className="w-3.5 h-3.5 mr-1" />
        Mover
      </Button>
    </div>
  );
}
