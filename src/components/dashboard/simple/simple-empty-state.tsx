'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Code } from 'lucide-react';
import { useViewMode } from '@/contexts/view-mode-context';

type SimpleEmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description: string;
  /** Primary CTA - shown prominently */
  action?: { label: string; onClick: () => void };
  /** Optional secondary CTA - shown as outline */
  secondaryAction?: { label: string; onClick: () => void };
  showDeveloperModeSwitch?: boolean;
};

export function SimpleEmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  showDeveloperModeSwitch = true,
}: SimpleEmptyStateProps) {
  const { setMode } = useViewMode();

  return (
    <Card className="border-dashed border-muted-foreground/20 bg-muted/20">
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        {icon && <div className="mb-4 text-muted-foreground [&>svg]:h-10 [&>svg]:w-10">{icon}</div>}
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {action && (
            <Button size="default" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" size="default" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
          {showDeveloperModeSwitch && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={() => setMode('developer')}
            >
              <Code className="h-4 w-4" />
              Switch to Developer Mode
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
