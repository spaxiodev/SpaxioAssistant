'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Code } from 'lucide-react';
import { useViewMode } from '@/contexts/view-mode-context';

type SimpleEmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  showDeveloperModeSwitch?: boolean;
};

export function SimpleEmptyState({
  icon,
  title,
  description,
  action,
  showDeveloperModeSwitch = true,
}: SimpleEmptyStateProps) {
  const { setMode } = useViewMode();

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-10 text-center">
        {icon && <div className="mb-3 text-muted-foreground">{icon}</div>}
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
        {action && (
          <Button className="mt-4" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
        {showDeveloperModeSwitch && (
          <Button
            variant="outline"
            size="sm"
            className="mt-3 gap-2"
            onClick={() => setMode('developer')}
          >
            <Code className="h-4 w-4" />
            Open in Developer Mode
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
