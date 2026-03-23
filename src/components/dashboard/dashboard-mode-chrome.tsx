'use client';

import { cn } from '@/lib/utils';
import { useViewMode } from '@/contexts/view-mode-context';

/**
 * Applies subtle visual distinction between Simple (calm) and Developer (structured) modes
 * on the main content area. Same data and routes; UI chrome only.
 */
export function DashboardModeChrome({ children }: { children: React.ReactNode }) {
  const { mode } = useViewMode();
  const simple = mode === 'simple';

  return (
    <div
      data-dashboard-mode={mode}
      className={cn(
        'min-h-[calc(100vh-4rem)] rounded-2xl border border-transparent transition-colors duration-300',
        simple
          ? 'bg-gradient-to-b from-sky-500/[0.04] via-background to-background'
          : 'bg-gradient-to-b from-violet-500/[0.05] via-background to-muted/20'
      )}
    >
      <div className={cn('p-4 md:p-6 lg:p-8', simple ? 'max-w-6xl' : 'max-w-[1400px]')}>{children}</div>
    </div>
  );
}
