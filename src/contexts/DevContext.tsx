import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DevContextType {
  isDevMode: boolean;
  toggleDevMode: () => void;
  isDevPanelOpen: boolean;
  setDevPanelOpen: (open: boolean) => void;
}

const DevContext = createContext<DevContextType | undefined>(undefined);

export function DevProvider({ children }: { children: ReactNode }) {
  const [isDevMode, setIsDevMode] = useState(false);
  const [isDevPanelOpen, setDevPanelOpen] = useState(false);

  const toggleDevMode = () => {
    setIsDevMode(prev => !prev);
    if (isDevMode) {
      setDevPanelOpen(false);
    }
  };

  return (
    <DevContext.Provider value={{ isDevMode, toggleDevMode, isDevPanelOpen, setDevPanelOpen }}>
      {children}
    </DevContext.Provider>
  );
}

export function useDev() {
  const context = useContext(DevContext);
  if (context === undefined) {
    throw new Error('useDev must be used within a DevProvider');
  }
  return context;
}
