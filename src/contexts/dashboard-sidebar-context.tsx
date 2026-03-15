'use client';

import { createContext, useContext, useState, useCallback } from 'react';

type DashboardSidebarContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const DashboardSidebarContext = createContext<DashboardSidebarContextValue | null>(null);

export function DashboardSidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  return (
    <DashboardSidebarContext.Provider value={{ open, setOpen, toggle }}>
      {children}
    </DashboardSidebarContext.Provider>
  );
}

export function useDashboardSidebar() {
  const ctx = useContext(DashboardSidebarContext);
  if (!ctx) return { open: false, setOpen: () => {}, toggle: () => {} };
  return ctx;
}
