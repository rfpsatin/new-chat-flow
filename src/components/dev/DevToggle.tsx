import { Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDev } from '@/contexts/DevContext';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';

export function DevToggle() {
  const { isDevMode, toggleDevMode, setDevPanelOpen } = useDev();
  const { currentUser } = useApp();

  const isDevAllowed = currentUser?.tipo_usuario === 'adm';

  if (!isDevAllowed) {
    return null;
  }

  const handleClick = () => {
    if (!isDevMode) {
      toggleDevMode();
      setDevPanelOpen(true);
    } else {
      setDevPanelOpen(true);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className={cn(
        "relative",
        isDevMode && "text-orange-500 hover:text-orange-600"
      )}
      title="DevCenter - Centro de Simulação"
    >
      <Wrench className="h-5 w-5" />
      {isDevMode && (
        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-orange-500" />
      )}
    </Button>
  );
}
