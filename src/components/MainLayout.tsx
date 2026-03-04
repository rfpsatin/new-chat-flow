import { Navigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useApp } from '@/contexts/AppContext';
import { DevProvider } from '@/contexts/DevContext';
import { DevToggle } from '@/components/dev/DevToggle';
import { DevPanel } from '@/components/dev/DevPanel';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { currentUser, authLoading } = useApp();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DevProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 flex flex-col">
            <header className="h-14 border-b bg-card flex items-center px-4 gap-4">
              <SidebarTrigger />
              <div className="flex-1" />
              <DevToggle />
            </header>
            <div className="flex-1 overflow-hidden h-0">
              {children}
            </div>
          </main>
        </div>
        <DevPanel />
      </SidebarProvider>
    </DevProvider>
  );
}
