'use client';

import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type SimpleAiAssistPanelProps = {
  title: string;
  description: string;
  actions: Array<{ label: string; onClick: () => void }>;
};

export function SimpleAiAssistPanel({ title, description, actions }: SimpleAiAssistPanelProps) {
  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant="secondary"
            size="sm"
            className="gap-1.5"
            onClick={action.onClick}
          >
            <Sparkles className="h-4 w-4" />
            {action.label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
