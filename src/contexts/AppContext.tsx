import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
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

const SESSION_HEARTBEAT_MS = 4 * 60 * 1000; // 4 min

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [selectedConversa, setSelectedConversa] = useState<import('@/types/atendimento').Conversa | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();

  const currentUserRef = useRef<Usuario | null>(null);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  const clearSessionAndRedirect = useCallback(() => {
    setCurrentUser(null);
    setSelectedConversa(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    let initialSessionHandled = false;

    const setLoadingDone = () => setAuthLoading(false);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
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
            console.warn('Auth session found but no active usuario record, signing out');
            setCurrentUser(null);
            await supabase.auth.signOut();
            navigate('/login', { replace: true });
          }
        } else {
          setCurrentUser(null);
          setSelectedConversa(null);
          if (event !== 'INITIAL_SESSION') {
            navigate('/login', { replace: true });
          }
        }
      } finally {
        setLoadingDone();
      }
    });

    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
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
            console.warn('Stale auth session detected, signing out');
            setCurrentUser(null);
            await supabase.auth.signOut();
            navigate('/login', { replace: true });
          }
        }
      })
      .catch((err) => {
        console.warn('getSession failed on load', err);
      })
      .finally(setLoadingDone);

    const timeoutId = window.setTimeout(setLoadingDone, 8000);

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(timeoutId);
    };
  }, []);

  // Re-validate session when the browser tab returns to the foreground.
  // Browsers freeze timers in background tabs, so the Supabase auto-refresh
  // may have missed a token renewal while the tab was hidden.
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;
      if (!currentUserRef.current) return;

      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          console.warn('Session expired while tab was in background');
          clearSessionAndRedirect();
        }
      } catch (err) {
        console.warn('visibilitychange session check failed:', err);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [clearSessionAndRedirect]);

  // Periodic heartbeat: ensures the session is still alive even when the user
  // is idle but the tab remains visible. Catches silent JWT expiry that would
  // otherwise only surface as 401 errors on data queries.
  useEffect(() => {
    const id = window.setInterval(async () => {
      if (!currentUserRef.current) return;

      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          console.warn('Session heartbeat: session no longer valid');
          clearSessionAndRedirect();
        }
      } catch (err) {
        console.warn('Session heartbeat failed:', err);
      }
    }, SESSION_HEARTBEAT_MS);

    return () => window.clearInterval(id);
  }, [clearSessionAndRedirect]);

  const logout = useCallback((): Promise<void> => {
    setCurrentUser(null);
    setSelectedConversa(null);
    navigate('/login', { replace: true });
    // Não chamamos signOut() aqui para evitar condição de corrida: um signOut()
    // assíncrono pode terminar depois do próximo login e apagar a sessão nova,
    // deixando o botão "Entrando..." travado. O próximo signInWithPassword
    // sobrescreve a sessão no storage; ao sair, o token antigo fica até o próximo login.
    return Promise.resolve();
  }, [navigate]);

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
