import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Usuario } from '@/types/atendimento';

interface AppContextType {
  currentUser: Usuario | null;
  setCurrentUser: (user: Usuario | null) => void;
  selectedConversa: import('@/types/atendimento').Conversa | null;
  setSelectedConversa: (conversa: import('@/types/atendimento').Conversa | null) => void;
  empresaId: string;
  authLoading: boolean;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [selectedConversa, setSelectedConversa] = useState<import('@/types/atendimento').Conversa | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let initialSessionHandled = false;

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip the INITIAL_SESSION event if we already handled it via getSession
      if (event === 'INITIAL_SESSION' && initialSessionHandled) return;

      if (session?.user) {
        const { data: usuario } = await supabase
          .from('usuarios')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .eq('ativo', true)
          .maybeSingle();

        if (usuario) {
          setCurrentUser(usuario as Usuario);
        } else {
          // Has auth session but no active usuario record - sign out
          console.warn('Auth session found but no active usuario record, signing out');
          setCurrentUser(null);
          await supabase.auth.signOut();
          navigate('/login', { replace: true });
        }
      } else {
        setCurrentUser(null);
        setSelectedConversa(null);
      }
      setAuthLoading(false);
    });

    // Check existing session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      initialSessionHandled = true;
      if (session?.user) {
        const { data: usuario } = await supabase
          .from('usuarios')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .eq('ativo', true)
          .maybeSingle();

        if (usuario) {
          setCurrentUser(usuario as Usuario);
        } else {
          // Has auth session but no active usuario - sign out and redirect
          console.warn('Stale auth session detected, signing out');
          setCurrentUser(null);
          await supabase.auth.signOut();
          navigate('/login', { replace: true });
        }
      }
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setSelectedConversa(null);
    navigate('/login', { replace: true });
  };

  const empresaId = currentUser?.empresa_id ?? '';

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        selectedConversa,
        setSelectedConversa,
        empresaId,
        authLoading,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
