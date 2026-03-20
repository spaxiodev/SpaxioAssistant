'use client';

/**
 * UsageOverviewCard — polished usage dashboard component.
 *
 * Shows all plan metrics with progress bars, warning states (70/90/100%),
 * status badges, and upgrade CTAs. Used on billing page and dashboard overview.
 */

import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, TrendingUp, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { Link } from '@/components/intl-link';
import type { RichUsageStatus, UsageWarningLevel, UsageWarning } from '@/lib/billing/access';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UsageMetricRowData = {
  label: string;
  used: number;
  limit: number;
  pct: number;
  status: UsageWarningLevel;
  /** If true, metric is periodic (monthly) and shows "this month" label */
  isPeriodic?: boolean;
  /** If true, metric is a feature flag (show/hide not count) */
  isFeature?: boolean;
};

export type UsageOverviewCardProps = {
  planName: string;
  planSlug: string;
  billingStatus: 'active' | 'trialing' | 'past_due' | 'canceled' | 'none';
  isActive: boolean;
  richUsage: RichUsageStatus;
  usageWarnings: UsageWarning[];
  periodStart?: string;
  periodEnd?: string;
  showUpgradeCta?: boolean;
  className?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function overallStatus(warnings: UsageWarning[]): UsageWarningLevel {
  if (warnings.some((w) => w.level === 'limit_reached')) return 'limit_reached';
  if (warnings.some((w) => w.level === 'high_usage')) return 'high_usage';
  if (warnings.some((w) => w.level === 'nearing_limit')) return 'nearing_limit';
  return 'healthy';
}

function statusLabel(level: UsageWarningLevel): string {
  switch (level) {
    case 'healthy':       return 'Healthy';
    case 'nearing_limit': return 'Nearing limit';
    case 'high_usage':    return 'High usage';
    case 'limit_reached': return 'Limit reached';
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ level }: { level: UsageWarningLevel }) {
  const variants: Record<UsageWarningLevel, string> = {
    healthy:       'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    nearing_limit: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400',
    high_usage:    'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400',
    limit_reached: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  };
  const icons: Record<UsageWarningLevel, React.ReactNode> = {
    healthy:       <CheckCircle className="h-3.5 w-3.5" />,
    nearing_limit: <AlertTriangle className="h-3.5 w-3.5" />,
    high_usage:    <TrendingUp className="h-3.5 w-3.5" />,
    limit_reached: <XCircle className="h-3.5 w-3.5" />,
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[level]
      )}
    >
      {icons[level]}
      {statusLabel(level)}
    </span>
  );
}

function ProgressBar({ pct, status }: { pct: number; status: UsageWarningLevel }) {
  const colors: Record<UsageWarningLevel, string> = {
    healthy:       '[&>div]:bg-emerald-500',
    nearing_limit: '[&>div]:bg-yellow-500',
    high_usage:    '[&>div]:bg-orange-500',
    limit_reached: '[&>div]:bg-red-500',
  };
  return <Progress value={pct} className={cn('h-1.5', colors[status])} />;
}

function MetricRow({
  label,
  used,
  limit,
  pct,
  status,
  isPeriodic,
}: UsageMetricRowData) {
  const limitDisplay = limit <= 0 ? '∞' : limit.toLocaleString();
  const usedDisplay = used.toLocaleString();

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{label}{isPeriodic ? ' / month' : ''}</span>
        <div className="flex items-center gap-2">
          <span className="tabular-nums">
            {usedDisplay}
            {limit > 0 && (
              <span className="text-muted-foreground"> / {limitDisplay}</span>
            )}
          </span>
          {status !== 'healthy' && <StatusBadge level={status} />}
        </div>
      </div>
      {limit > 0 && <ProgressBar pct={pct} status={status} />}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function UsageOverviewCard({
  planName,
  planSlug,
  billingStatus,
  isActive,
  richUsage,
  usageWarnings,
  periodStart,
  periodEnd,
  showUpgradeCta = true,
  className,
}: UsageOverviewCardProps) {
  const overall = overallStatus(usageWarnings);
  const isLimitReached = overall === 'limit_reached';
  const hasWarnings = usageWarnings.length > 0;

  const periodLabel =
    periodStart && periodEnd
      ? `${new Date(periodStart).toLocaleDateString()} – ${new Date(periodEnd).toLocaleDateString()}`
      : 'This billing period';

  const monthly: UsageMetricRowData[] = [
    {
      label: 'AI replies',
      used: richUsage.message_count,
      limit: richUsage.message_limit,
      pct: richUsage.messages_pct,
      status: richUsage.messages_status,
      isPeriodic: true,
    },
    {
      label: 'AI actions',
      used: richUsage.ai_action_count,
      limit: richUsage.ai_action_limit,
      pct: richUsage.ai_actions_pct,
      status: richUsage.ai_actions_status,
      isPeriodic: true,
    },
  ];

  const resources: UsageMetricRowData[] = [
    {
      label: 'Assistants',
      used: richUsage.agents_count,
      limit: richUsage.agents_limit,
      pct: richUsage.agents_pct,
      status: richUsage.agents_status,
    },
    {
      label: 'Widgets',
      used: richUsage.widgets_count,
      limit: richUsage.widgets_limit,
      pct: richUsage.widgets_pct,
      status: richUsage.widgets_status,
    },
    {
      label: 'Knowledge sources',
      used: richUsage.knowledge_sources_count,
      limit: richUsage.knowledge_sources_limit,
      pct: richUsage.knowledge_sources_pct,
      status: richUsage.knowledge_sources_status,
    },
    {
      label: 'Team members',
      used: richUsage.team_members_count,
      limit: richUsage.team_members_limit,
      pct: richUsage.team_members_pct,
      status: richUsage.team_members_status,
    },
    ...(richUsage.automations_limit > 0
      ? [
          {
            label: 'Automations',
            used: richUsage.automations_count,
            limit: richUsage.automations_limit,
            pct: richUsage.automations_pct,
            status: richUsage.automations_status,
          } as UsageMetricRowData,
        ]
      : []),
  ];

  return (
    <Card
      className={cn(
        'transition-colors',
        isLimitReached && 'border-red-200 dark:border-red-900',
        hasWarnings && !isLimitReached && 'border-orange-200 dark:border-orange-900',
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              Usage overview
              <StatusBadge level={overall} />
            </CardTitle>
            <CardDescription className="mt-0.5">
              {planName} plan · {periodLabel}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isActive ? 'default' : 'secondary'} className="capitalize font-normal">
              {billingStatus === 'trialing' ? 'Trial' : billingStatus === 'active' ? 'Active' : billingStatus}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Warning banner */}
        {hasWarnings && (
          <div
            className={cn(
              'rounded-lg border p-3 text-sm',
              isLimitReached
                ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300'
                : 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-300'
            )}
          >
            <p className="font-medium">{usageWarnings[0].message}</p>
            {isLimitReached && richUsage.messages_status === 'limit_reached' && (
              <p className="mt-1 text-xs opacity-80">
                Your widget can still collect leads and quote requests while AI replies are paused.
              </p>
            )}
          </div>
        )}

        {/* Monthly usage */}
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Monthly usage
          </p>
          <div className="space-y-3">
            {monthly.map((m) => (
              <MetricRow key={m.label} {...m} />
            ))}
          </div>
        </div>

        {/* Resource counts */}
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Plan resources
          </p>
          <div className="space-y-3">
            {resources.map((r) => (
              <MetricRow key={r.label} {...r} />
            ))}
          </div>
        </div>

        {/* Upgrade CTA */}
        {showUpgradeCta && (hasWarnings || planSlug === 'free') && (
          <div className="pt-1 border-t">
            <Button asChild size="sm" variant={isLimitReached ? 'default' : 'outline'} className="gap-1.5">
              <Link href="/pricing">
                {isLimitReached ? 'Upgrade now' : 'View plans'}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            {isLimitReached && richUsage.messages_status === 'limit_reached' && (
              <p className="mt-2 text-xs text-muted-foreground">
                Lead capture and quote forms remain active.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
