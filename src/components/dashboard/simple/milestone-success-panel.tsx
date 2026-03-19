'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle2, LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export type MilestoneSuccessPanelProps = {
  headline: string;
  description: string;
  /** Single strong next step CTA */
  nextStep: { label: string; href: string };
  icon?: LucideIcon;
};

/**
 * Polished success state after key user milestones.
 * Makes the experience feel rewarding and momentum-driven.
 */
export function MilestoneSuccessPanel({
  headline,
  description,
  nextStep,
  icon: Icon = CheckCircle2,
}: MilestoneSuccessPanelProps) {
  const router = useRouter();

  return (
    <Card className="border-green-500/30 bg-green-500/5">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500/10 text-green-600 dark:text-green-400">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base text-green-800 dark:text-green-200">{headline}</CardTitle>
            <CardDescription className="mt-1 text-green-700/80 dark:text-green-300/80">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button
          size="sm"
          className="gap-2 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
          onClick={() => router.push(nextStep.href)}
        >
          {nextStep.label}
        </Button>
      </CardContent>
    </Card>
  );
}
