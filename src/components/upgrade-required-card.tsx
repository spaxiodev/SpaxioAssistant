'use client';

import { Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/components/intl-link';
import { useTranslations } from 'next-intl';
import {
  type FeatureKey,
  FEATURE_LABELS,
  getUpgradePlanForFeature,
  buildUpgradeUrl,
  PLAN_DISPLAY_NAMES,
} from '@/lib/plan-config';

export type UpgradeRequiredCardProps = {
  /** Feature that requires upgrade (used for label + recommended plan). Ignored if upgradeHref provided. */
  featureKey: FeatureKey;
  /** Current plan display name (e.g. "Starter"). */
  currentPlanName?: string | null;
  /** Optional custom title. */
  title?: string;
  /** Optional custom description. */
  description?: string;
  /** Optional: pass from= for upgrade URL (e.g. "automations"). */
  from?: string;
  /** Optional: override upgrade URL (e.g. for limit-reached with custom recommended plan). */
  upgradeHref?: string;
  /** Optional: recommended plan name when using upgradeHref (for badge). */
  recommendedPlanName?: string;
  /** Optional: show compact card (less padding). */
  compact?: boolean;
  /** Optional: when true, do not show the "feature is available on X plan" line (e.g. for limit-reached). */
  skipFeatureLine?: boolean;
};

export function UpgradeRequiredCard({
  featureKey,
  currentPlanName,
  title,
  description,
  from,
  upgradeHref: upgradeHrefOverride,
  recommendedPlanName: recommendedPlanNameOverride,
  compact,
  skipFeatureLine,
}: UpgradeRequiredCardProps) {
  const t = useTranslations('dashboard');
  const recommendedSlug = getUpgradePlanForFeature(featureKey);
  const recommendedName = recommendedPlanNameOverride ?? PLAN_DISPLAY_NAMES[recommendedSlug];
  const featureLabel = FEATURE_LABELS[featureKey];
  const defaultTitle = t('upgradeRequired');
  const defaultDescription = t('featureRequiresPlan', { plan: recommendedName });

  const upgradeHref =
    upgradeHrefOverride ??
    buildUpgradeUrl({
      from: from ?? featureKey,
      current: currentPlanName ?? undefined,
      recommended: recommendedSlug,
    });

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent dark:from-primary/10">
      <CardHeader className={compact ? 'pb-2' : undefined}>
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg">{title ?? defaultTitle}</CardTitle>
            <CardDescription>{description ?? defaultDescription}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className={compact ? 'pt-0' : undefined}>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {currentPlanName && (
            <Badge variant="secondary" className="font-normal">
              {t('yourPlan')}: {currentPlanName}
            </Badge>
          )}
          <Badge variant="default" className="font-normal">
            {t('recommendedPlan')}: {recommendedName}
          </Badge>
        </div>
        {!skipFeatureLine && (
          <p className="mt-3 text-sm text-muted-foreground">
            {featureLabel} is available on the {recommendedName} plan and above.
          </p>
        )}
        <Button asChild className="mt-4" size={compact ? 'sm' : 'default'}>
          <Link href={upgradeHref}>{t('viewPlans')}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
