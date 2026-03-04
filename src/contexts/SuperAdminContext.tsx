import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface SuperAdminContextType {
  user: User | null;
  isSuperAdmin: boolean;
  loading: boolean;
  logout: () => Promise<void>;
}

const SuperAdminContext = createContext<SuperAdminContextType>({
  user: null,
  isSuperAdmin: false,
  loading: true,
  logout: async () => {},
});

export function SuperAdminProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkSuperAdmin = async (userId: string) => {
    const { data } = await supabase
      .from('super_admins')
      .select('id')
      .eq('auth_user_id', userId)
      .maybeSingle();
    return !!data;
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        const isAdmin = await checkSuperAdmin(session.user.id);
        setIsSuperAdmin(isAdmin);
      } else {
        setUser(null);
        setIsSuperAdmin(false);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        const isAdmin = await checkSuperAdmin(session.user.id);
        setIsSuperAdmin(isAdmin);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsSuperAdmin(false);
  };

  return (
    <SuperAdminContext.Provider value={{ user, isSuperAdmin, loading, logout }}>
      {children}
    </SuperAdminContext.Provider>
  );
}

export const useSuperAdmin = () => useContext(SuperAdminContext);
