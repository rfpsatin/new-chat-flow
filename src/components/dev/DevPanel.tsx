import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDev } from '@/contexts/DevContext';
import { ClienteSimulator } from './tabs/ClienteSimulator';
import { BotSimulator } from './tabs/BotSimulator';
import { AdminControls } from './tabs/AdminControls';
import { EventMonitor } from './tabs/EventMonitor';

export function DevPanel() {
  const { isDevPanelOpen, setDevPanelOpen, toggleDevMode } = useDev();

  const handleClose = () => {
    setDevPanelOpen(false);
  };

  const handleDisableDevMode = () => {
    toggleDevMode();
    setDevPanelOpen(false);
  };

  return (
    <Sheet open={isDevPanelOpen} onOpenChange={setDevPanelOpen}>
      <SheetContent side="right" className="w-[400px] sm:w-[450px] p-0">
        <SheetHeader className="p-4 border-b bg-orange-500/10">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <span className="text-orange-500">🔧</span>
              DevCenter
            </SheetTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleDisableDevMode}>
                Desativar
              </Button>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="cliente" className="h-[calc(100vh-80px)]">
          <TabsList className="w-full justify-start rounded-none border-b px-4">
            <TabsTrigger value="cliente" className="text-xs">Cliente</TabsTrigger>
            <TabsTrigger value="bot" className="text-xs">Bot</TabsTrigger>
            <TabsTrigger value="admin" className="text-xs">Controles</TabsTrigger>
            <TabsTrigger value="monitor" className="text-xs">Monitor</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100vh-140px)]">
            <div className="p-4">
              <TabsContent value="cliente" className="m-0">
                <ClienteSimulator />
              </TabsContent>

              <TabsContent value="bot" className="m-0">
                <BotSimulator />
              </TabsContent>

              <TabsContent value="admin" className="m-0">
                <AdminControls />
              </TabsContent>

              <TabsContent value="monitor" className="m-0">
                <EventMonitor />
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
