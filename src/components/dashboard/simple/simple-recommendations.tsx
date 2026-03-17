'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';

type SimpleRecommendationsProps = {
  title?: string;
  items: string[];
};

export function SimpleRecommendations({
  title = 'Recommended next steps',
  items,
}: SimpleRecommendationsProps) {
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          {title}
        </CardTitle>
        <CardDescription>Things you can do next to get more from your assistant.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500/60" />
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
