import { Navigate } from 'react-router-dom';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';

export function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isSuperAdmin, loading } = useSuperAdmin();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user || !isSuperAdmin) {
    return <Navigate to="/superadmin/login" replace />;
  }

  return <>{children}</>;
}
