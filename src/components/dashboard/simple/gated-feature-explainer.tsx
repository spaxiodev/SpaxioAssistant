'use client';

import { Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from '@/components/intl-link';

export type GatedFeatureExplainerProps = {
  title: string;
  /** Plain-language description of what the feature does */
  whatItDoes: string;
  /** Why it matters to the user */
  whyItMatters: string;
  upgradeHref?: string;
  /** Optional: custom CTA label */
  ctaLabel?: string;
};

/**
 * Polished explainer for locked/plan-gated features.
 * Shows what the feature does, why it matters, and a clear upgrade CTA.
 */
export function GatedFeatureExplainer({
  title,
  whatItDoes,
  whyItMatters,
  upgradeHref = '/dashboard/billing',
  ctaLabel = 'View plans',
}: GatedFeatureExplainerProps) {
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="mt-1 space-y-1">
              <span className="block">{whatItDoes}</span>
              <span className="block font-medium text-foreground/80">{whyItMatters}</span>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button asChild size="sm">
          <Link href={upgradeHref}>{ctaLabel}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
