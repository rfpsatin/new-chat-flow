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

function isAuthError(error: unknown): boolean {
  if (!error) return false;
  const e = error as { status?: number; message?: string; name?: string };
  if (e.status === 401 || e.status === 403) return true;
  const msg = (e.message || '').toLowerCase();
  return msg.includes('session_not_found')
    || msg.includes('jwt expired')
    || msg.includes('invalid jwt')
    || e.name === 'AuthSessionMissingError';
}

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
    const setLoadingDone = () => setAuthLoading(false);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
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
            console.warn('Auth session exists but no active usuario record');
            setCurrentUser(null);
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

    const timeoutId = window.setTimeout(setLoadingDone, 8000);

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;
      if (!currentUserRef.current) return;

      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error && isAuthError(error)) {
          console.warn('Session expired (visibility check):', error.message);
          clearSessionAndRedirect();
        } else if (!error && !user) {
          console.warn('Session gone (visibility check)');
          clearSessionAndRedirect();
        }
      } catch {
        // Network or transient error – keep session alive
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [clearSessionAndRedirect]);

  useEffect(() => {
    const id = window.setInterval(async () => {
      if (!currentUserRef.current) return;

      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error && isAuthError(error)) {
          console.warn('Session heartbeat: auth error', error.message);
          clearSessionAndRedirect();
        } else if (!error && !user) {
          console.warn('Session heartbeat: no user');
          clearSessionAndRedirect();
        }
      } catch {
        // Network or transient error – keep session alive
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
