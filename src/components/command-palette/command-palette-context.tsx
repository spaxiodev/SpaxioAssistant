'use client';

import { createContext, useContext } from 'react';

type CommandPaletteContextType = {
  open: () => void;
  close: () => void;
  toggle: () => void;
  isOpen: boolean;
};

export const CommandPaletteContext = createContext<CommandPaletteContextType | null>(null);

export function useCommandPalette(): CommandPaletteContextType {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) {
    throw new Error('useCommandPalette must be used within CommandPaletteProvider');
  }
  return ctx;
}
