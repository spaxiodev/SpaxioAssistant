import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
}

export function Progress({ value = 0, className, ...props }: ProgressProps) {
  const v = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  return (
    <div
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-muted shadow-[inset_0_0_0_1px_hsl(var(--border)/0.55)]',
        className
      )}
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      <div
        className="h-full w-full flex-1 bg-[linear-gradient(135deg,hsl(var(--primary)),rgb(14_165_233))] transition-transform"
        style={{ transform: `translateX(-${100 - v}%)` }}
      />
    </div>
  );
}

