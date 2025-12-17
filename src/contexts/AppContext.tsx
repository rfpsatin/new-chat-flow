import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Usuario, Conversa } from '@/types/atendimento';

interface AppContextType {
  currentUser: Usuario | null;
  setCurrentUser: (user: Usuario | null) => void;
  selectedConversa: Conversa | null;
  setSelectedConversa: (conversa: Conversa | null) => void;
  empresaId: string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Demo empresa ID
const DEMO_EMPRESA_ID = '11111111-1111-1111-1111-111111111111';

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [selectedConversa, setSelectedConversa] = useState<Conversa | null>(null);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        selectedConversa,
        setSelectedConversa,
        empresaId: DEMO_EMPRESA_ID,
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
