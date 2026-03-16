'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type ViewMode = 'simple' | 'developer';

type ViewModeContextValue = {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
};

const ViewModeContext = createContext<ViewModeContextValue | undefined>(undefined);

const STORAGE_KEY = 'spaxio-view-mode';

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ViewMode>('simple');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'simple' || stored === 'developer') {
      setModeState(stored);
    }
  }, []);

  const setMode = (next: ViewMode) => {
    setModeState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  };

  return <ViewModeContext.Provider value={{ mode, setMode }}>{children}</ViewModeContext.Provider>;
}

export function useViewMode() {
  const ctx = useContext(ViewModeContext);
  if (!ctx) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return ctx;
}

