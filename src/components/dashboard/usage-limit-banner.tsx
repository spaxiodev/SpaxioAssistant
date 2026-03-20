'use client';

/**
 * UsageLimitBanner — inline banner shown when a resource creation limit is reached.
 *
 * Used on Knowledge, Team, Automations, Agents, Widgets pages.
 * Shows polished copy, the current/limit count, and an upgrade CTA.
 * Does NOT replace the feature entirely; it sits above the disabled "Add" button.
 */

import { cn } from '@/lib/utils';
import { AlertTriangle, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@/components/intl-link';
import type { AccessStatus } from '@/lib/billing/access';

export type UsageLimitBannerProps = {
  /** e.g. "knowledge sources", "team members", "automations" */
  resourceLabel: string;
  /** Used count. */
  used: number;
  /** Plan limit. */
  limit: number;
  /** Access status from canCreateResource(). */
  status: AccessStatus;
  /** Custom message override. */
  message?: string;
  /** Where to link for upgrade. Defaults to /pricing. */
  upgradeHref?: string;
  className?: string;
};

const DEFAULT_MESSAGES: Record<string, string> = {
  limit_reached:    "You've reached the {label} limit for your current plan. Existing {label} continue working.",
  requires_upgrade: "{label} is not available on your current plan.",
  warning:          "You're approaching your {label} limit.",
};

function interpolate(template: string, label: string): string {
  return template.replace(/{label}/g, label);
}

export function UsageLimitBanner({
  resourceLabel,
  used,
  limit,
  status,
  message,
  upgradeHref = '/pricing',
  className,
}: UsageLimitBannerProps) {
  if (status === 'allowed') return null;

  const isHard = status === 'requires_upgrade';
  const isLimit = status === 'limit_reached';
  const isWarning = status === 'warning';

  const defaultMessage = isHard
    ? DEFAULT_MESSAGES['requires_upgrade']
    : isLimit
      ? DEFAULT_MESSAGES['limit_reached']
      : DEFAULT_MESSAGES['warning'];

  const displayMessage = interpolate(message ?? defaultMessage, resourceLabel);

  return (
    <div
      className={cn(
        'flex flex-wrap items-start gap-3 rounded-lg border p-4 text-sm',
        isLimit || isHard
          ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200'
          : 'border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-200',
        className
      )}
    >
      <div className="mt-0.5 shrink-0">
        {isHard ? (
          <Lock className="h-4 w-4" />
        ) : (
          <AlertTriangle className="h-4 w-4" />
        )}
      </div>
      <div className="flex-1 space-y-2">
        <p className="font-medium leading-snug">{displayMessage}</p>
        {isLimit && limit > 0 && (
          <p className="text-xs opacity-75">
            {used} / {limit} {resourceLabel} used
          </p>
        )}
        <Button asChild size="sm" variant="outline" className="gap-1.5 h-7 text-xs">
          <Link href={upgradeHref}>
            Upgrade your plan
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
