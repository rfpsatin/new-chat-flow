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
    <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b bg-muted/30">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onCancelar} className="h-8 px-2">
          <X className="w-4 h-4" />
        </Button>
        <span className="text-sm font-medium text-foreground">
          {selectedCount} selecionada{selectedCount !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="destructive"
          size="sm"
          disabled={!hasSelection}
          onClick={onEncerrar}
          className="h-8 text-xs"
        >
          <XCircle className="w-3.5 h-3.5 mr-1" />
          Encerrar
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasSelection}
          onClick={onMover}
          className="h-8 text-xs"
        >
          <ArrowRightLeft className="w-3.5 h-3.5 mr-1" />
          Mover
        </Button>
      </div>
    </div>
  );
}
