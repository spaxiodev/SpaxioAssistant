'use client';

import { cn } from '@/lib/utils';
import { useViewMode } from '@/contexts/view-mode-context';
import { Sparkles, SlidersHorizontal } from 'lucide-react';

/**
 * Compact mode toggle — single place to switch Simple vs Developer (no duplicate sidebar CTA).
 * Helper copy lives in `title` for hover / screen readers to keep the bar calm.
 */
export function DashboardModeSwitcher({ className }: { className?: string }) {
  const { mode, setMode } = useViewMode();
  const isSimple = mode === 'simple';

  const hint = isSimple
    ? 'Simple: guided setup and everyday use. Switch to Developer for advanced options.'
    : 'Developer: full controls and configuration. Switch to Simple for the guided experience.';

  return (
    <div
      className={cn('inline-flex min-w-0 max-w-full items-center', className)}
      title={hint}
    >
      <div
        className="flex min-w-0 items-center rounded-lg border border-border/70 bg-muted/30 p-0.5 shadow-sm"
        role="group"
        aria-label={hint}
      >
        <button
          type="button"
          onClick={() => setMode('simple')}
          className={cn(
            'flex min-h-8 items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all sm:px-3 sm:text-sm',
            isSimple
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
          )}
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-sky-500" aria-hidden />
          <span className="hidden sm:inline">Simple</span>
        </button>
        <button
          type="button"
          onClick={() => setMode('developer')}
          className={cn(
            'flex min-h-8 items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all sm:px-3 sm:text-sm',
            !isSimple
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-violet-500" aria-hidden />
          <span className="hidden sm:inline">Developer</span>
        </button>
      </div>
    </div>
  );
}
