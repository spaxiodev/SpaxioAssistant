'use client';

import { Search } from 'lucide-react';
import { useCommandPalette } from './command-palette-context';
import { cn } from '@/lib/utils';

type SearchTriggerProps = {
  className?: string;
};

export function SearchTrigger({ className }: SearchTriggerProps) {
  const { toggle } = useCommandPalette();

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'flex min-w-0 items-center justify-start gap-2 rounded-lg border border-input bg-muted px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        className
      )}
      aria-label="Search"
    >
      <Search className="h-4 w-4 shrink-0" />
      <span className="hidden sm:inline">Search…</span>
      <kbd className="pointer-events-none hidden shrink-0 items-center gap-0.5 rounded border bg-background/80 px-1.5 py-0.5 font-mono text-[10px] font-medium sm:flex">
        {isMac ? '⌘' : 'Ctrl'}K
      </kbd>
    </button>
  );
}
