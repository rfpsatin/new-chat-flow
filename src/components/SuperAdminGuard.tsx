import { Navigate, Link } from 'react-router-dom';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';

export function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isSuperAdmin, loading } = useSuperAdmin();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <Link to="/login" className="text-sm text-muted-foreground hover:text-primary underline">
          Voltar ao login
        </Link>
      </div>
    );
  }

  if (!user || !isSuperAdmin) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
