'use client';

import { cn } from '@/lib/utils';

type SimpleSetupSkeletonProps = {
  /** Number of animated placeholder lines */
  lines?: number;
  className?: string;
};

/**
 * Skeleton placeholder for setup/loading states.
 * Use instead of awkward blank areas or spinners alone.
 */
export function SimpleSetupSkeleton({ lines = 4, className }: SimpleSetupSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 animate-pulse rounded bg-muted"
          style={{ width: i === lines - 1 && lines > 2 ? '60%' : '100%' }}
        />
      ))}
    </div>
  );
}
