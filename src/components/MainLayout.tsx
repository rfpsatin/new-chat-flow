import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useApp } from '@/contexts/AppContext';
import { UserSelector } from '@/components/UserSelector';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { currentUser } = useApp();

  if (!currentUser) {
    return <UserSelector />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-14 border-b bg-card flex items-center px-4 gap-4">
            <SidebarTrigger />
          </header>
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
