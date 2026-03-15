'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({ theme: 'dark', setTheme: () => {} });

const STORAGE_KEY = 'spaxio-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      const resolved: Theme = stored === 'light' || stored === 'dark' ? stored : 'dark';
      setThemeState(resolved);
      document.documentElement.classList.toggle('dark', resolved === 'dark');
    } catch {
      setThemeState('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);

  function setTheme(next: Theme) {
    setThemeState(next);
    try {
      if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable (e.g. private browsing on mobile)
    }
    document.documentElement.classList.toggle('dark', next === 'dark');
  }

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
