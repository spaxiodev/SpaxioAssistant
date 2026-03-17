'use client';

import { cn } from '@/lib/utils';

type SimpleQuickActionCardProps = {
  title: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  onClick: () => void;
  className?: string;
};

export function SimpleQuickActionCard({
  title,
  description,
  icon: Icon,
  onClick,
  className,
}: SimpleQuickActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-start gap-2 rounded-xl border bg-card px-3 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  );
}
