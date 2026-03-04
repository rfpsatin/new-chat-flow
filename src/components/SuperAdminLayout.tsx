import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';
import { Building2, LogOut, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SuperAdminLayout({ children }: { children: ReactNode }) {
  const { logout, user } = useSuperAdmin();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/superadmin/login');
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-4 border-b flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-bold text-sm">Super Admin</h1>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>

        <nav className="flex-1 p-2">
          <button
            onClick={() => navigate('/superadmin/empresas')}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
              location.pathname.includes('/superadmin/empresas') || location.pathname === '/superadmin'
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-foreground"
            )}
          >
            <Building2 className="h-4 w-4" />
            Empresas
          </button>
        </nav>

        <div className="p-2 border-t">
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
