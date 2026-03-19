'use client';

import { useRouter } from 'next/navigation';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export type BlockingGuidancePanelProps = {
  title: string;
  description: string;
  /** Primary CTA – takes user to the recommended setup route */
  primaryAction: { label: string; href: string };
  /** Optional secondary action */
  secondaryAction?: { label: string; href: string };
  icon?: LucideIcon;
};

/**
 * Polished blocking panel when a user reaches a page before they're ready.
 * Use instead of confusing empty states.
 */
export function BlockingGuidancePanel({
  title,
  description,
  primaryAction,
  secondaryAction,
  icon: Icon,
}: BlockingGuidancePanelProps) {
  const router = useRouter();

  return (
    <Card className="border-amber-500/20 bg-amber-500/5">
      <CardHeader>
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button onClick={() => router.push(primaryAction.href)}>{primaryAction.label}</Button>
        {secondaryAction && (
          <Button variant="outline" onClick={() => router.push(secondaryAction.href)}>
            {secondaryAction.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
