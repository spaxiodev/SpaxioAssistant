'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type SimpleActionCardProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** If true, uses a subtle primary tint for AI / primary actions */
  variant?: 'default' | 'primary';
};

export function SimpleActionCard({
  title,
  description,
  icon,
  children,
  className,
  variant = 'default',
}: SimpleActionCardProps) {
  return (
    <Card
      className={
        variant === 'primary'
          ? `border-primary/40 bg-primary/5 ${className ?? ''}`
          : className
      }
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          {title}
        </CardTitle>
        {description && <CardDescription className="text-sm">{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
