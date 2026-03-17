'use client';

import { useCallback, useEffect, useState } from 'react';
import { CommandPaletteContext } from './command-palette-context';
import { CommandPaletteContent } from './command-palette';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

type CommandPaletteProviderProps = {
  children: React.ReactNode;
};

export function CommandPaletteProvider({ children }: CommandPaletteProviderProps) {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);
  const openPalette = useCallback(() => setOpen(true), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggle]);

  return (
    <CommandPaletteContext.Provider
      value={{ open: openPalette, close, toggle, isOpen: open }}
    >
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showClose={false}
          className="border-0 bg-card p-0 shadow-none max-w-4xl w-full"
          onEscapeKeyDown={close}
          onPointerDownOutside={close}
        >
          <CommandPaletteContent />
        </DialogContent>
      </Dialog>
    </CommandPaletteContext.Provider>
  );
}
