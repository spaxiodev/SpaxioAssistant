'use client';

import type { FeatureKey } from '@/lib/plan-config';
import { UpgradeRequiredCard } from '@/components/upgrade-required-card';

export type FeatureGateProps = {
  /** Whether the user has access to this feature. */
  hasAccess: boolean;
  /** Feature key (for upgrade card label + recommended plan). */
  featureKey: FeatureKey;
  /** Current plan display name. */
  currentPlanName?: string | null;
  /** Optional: pass from= for upgrade URL. */
  from?: string;
  /** Optional: custom title for upgrade card. */
  upgradeTitle?: string;
  /** Optional: custom description for upgrade card. */
  upgradeDescription?: string;
  /** Content to render when hasAccess is true. */
  children: React.ReactNode;
  /** Optional: compact upgrade card. */
  compact?: boolean;
};

/**
 * Renders children when the user has access; otherwise shows UpgradeRequiredCard.
 * Use for page-level or section-level gating.
 */
export function FeatureGate({
  hasAccess,
  featureKey,
  currentPlanName,
  from,
  upgradeTitle,
  upgradeDescription,
  children,
  compact,
}: FeatureGateProps) {
  if (hasAccess) {
    return <>{children}</>;
  }
  return (
    <UpgradeRequiredCard
      featureKey={featureKey}
      currentPlanName={currentPlanName}
      title={upgradeTitle}
      description={upgradeDescription}
      from={from}
      compact={compact}
    />
  );
}
