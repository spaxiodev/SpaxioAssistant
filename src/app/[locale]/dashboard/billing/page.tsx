import { getOrganizationId } from '@/lib/auth-server';
import { Link } from '@/components/intl-link';
import { createAdminClient } from '@/lib/supabase/admin';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { getOrganizationAccessSnapshot } from '@/lib/billing/access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckoutButton } from '@/app/dashboard/billing/checkout-button';
import { UsageOverviewCard } from '@/components/dashboard/usage-overview-card';
import { getTranslations } from 'next-intl/server';
import { ArrowRight, ShieldCheck } from 'lucide-react';

export default async function BillingPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');
  const adminAllowed = await isOrgAllowedByAdmin(supabase, orgId);
  const snapshot = await getOrganizationAccessSnapshot(supabase, orgId, adminAllowed);

  const { isActive, isTrialing, planName, planSlug, billingStatus, trialEndsAt, currentPeriodEnd } = snapshot;
  const trialEnd = trialEndsAt ? new Date(trialEndsAt) : null;
  const periodEnd = currentPeriodEnd ? new Date(currentPeriodEnd) : null;
  const hasStripeSubscription = billingStatus === 'active' || billingStatus === 'trialing';
  const isPastDue = billingStatus === 'past_due';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('billingTitle')}</h1>
        <p className="text-muted-foreground">{t('billingDescription')}</p>
      </div>

      {/* Past-due warning */}
      {isPastDue && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
          <CardContent className="flex items-start gap-3 pt-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
            <div className="space-y-1">
              <p className="font-medium text-red-900 dark:text-red-200">Your payment is past due</p>
              <p className="text-sm text-red-700 dark:text-red-300">
                Please update your payment method to keep your account active.
              </p>
              <form action="/api/billing/portal" method="POST" className="mt-2">
                <input type="hidden" name="organizationId" value={orgId} />
                <Button type="submit" size="sm" variant="destructive">
                  Update payment method
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prominent upgrade CTA when not subscribed */}
      {!isActive && !isPastDue && (
        <Card className="border-2 border-primary bg-primary/5 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">{t('upgradeCtaTitle')}</CardTitle>
            <CardDescription className="text-base">{t('upgradeCtaDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CheckoutButton
              organizationId={orgId}
              subscribeLabel={t('upgrade')}
              redirectingLabel={t('redirecting')}
              className="rounded-lg px-6 py-6 text-base font-semibold"
            />
            <p className="text-xs text-muted-foreground">
              Start with a 49-day free trial. No credit card required upfront.{' '}
              <Link href="/pricing" className="underline hover:no-underline">
                View all plans →
              </Link>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Current plan card */}
      <Card className="border-primary/30">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                {planName}
                <Badge variant={isActive ? 'default' : 'secondary'} className="font-normal capitalize">
                  {adminAllowed ? 'Admin' : billingStatus === 'trialing' ? 'Trial' : billingStatus === 'active' ? 'Active' : billingStatus}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-1">{t('currentPlanDescription')}</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href="/pricing">
                View all plans
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {adminAllowed && (
            <p className="text-sm text-muted-foreground">{t('adminFree')}</p>
          )}
          {!adminAllowed && billingStatus === 'trialing' && trialEnd && (
            <p className="text-sm text-muted-foreground">
              {t('freeTrialEnds', { date: trialEnd.toLocaleDateString() })}
            </p>
          )}
          {!adminAllowed && billingStatus === 'active' && periodEnd && (
            <p className="text-sm text-muted-foreground">
              {t('currentPeriodEnds', { date: periodEnd.toLocaleDateString() })}
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            {!isActive && (
              <CheckoutButton
                organizationId={orgId}
                subscribeLabel={t('subscribeNow')}
                redirectingLabel={t('redirecting')}
              />
            )}
            {hasStripeSubscription && (
              <form action="/api/billing/portal" method="POST">
                <input type="hidden" name="organizationId" value={orgId} />
                <Button type="submit" variant="outline" size="sm" title={t('manageSubscriptionHint')}>
                  {t('manageSubscription')}
                </Button>
              </form>
            )}
          </div>
          {hasStripeSubscription && (
            <p className="text-xs text-muted-foreground">{t('manageSubscriptionHint')}</p>
          )}
        </CardContent>
      </Card>

      {/* Rich usage overview */}
      <UsageOverviewCard
        planName={planName}
        planSlug={planSlug ?? 'free'}
        billingStatus={billingStatus}
        isActive={isActive}
        richUsage={snapshot.richUsage}
        usageWarnings={snapshot.usageWarnings}
        periodStart={snapshot.usage.period_start}
        periodEnd={snapshot.usage.period_end}
        showUpgradeCta={!adminAllowed}
      />

      {/* What happens at limits — educational card */}
      <Card className="border-dashed border-muted-foreground/20 bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Good to know</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">AI reply limit reached?</strong>{' '}
            Your widget stays live. Visitors can still submit lead forms and quote requests — AI replies are temporarily paused.
          </p>
          <p>
            <strong className="text-foreground">Knowledge sources at limit?</strong>{' '}
            Existing sources keep working. Upgrade to add more.
          </p>
          <p>
            <strong className="text-foreground">Team member limit?</strong>{' '}
            Current teammates stay active. Upgrade to invite more.
          </p>
        </CardContent>
      </Card>

      {/* Upgrade plan options — show when not on business or enterprise */}
      {isActive && !adminAllowed && planSlug !== 'business' && planSlug !== 'enterprise' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Need more capacity?</CardTitle>
            <CardDescription>
              Upgrade anytime to get higher limits, more team members, and premium features.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(planSlug === 'free' || planSlug === null) && (
              <CheckoutButton
                organizationId={orgId}
                planId="starter"
                subscribeLabel="Upgrade to Starter"
                redirectingLabel={t('redirecting')}
                variant="outline"
              />
            )}
            {(planSlug === 'free' || planSlug === 'starter' || planSlug === null) && (
              <CheckoutButton
                organizationId={orgId}
                planId="pro"
                subscribeLabel="Upgrade to Pro"
                redirectingLabel={t('redirecting')}
              />
            )}
            {(planSlug === 'pro' || planSlug === 'legacy_assistant_pro') && (
              <CheckoutButton
                organizationId={orgId}
                planId="business"
                subscribeLabel="Upgrade to Business"
                redirectingLabel={t('redirecting')}
              />
            )}
          </CardContent>
        </Card>
      )}

      {adminAllowed && (
        <>
          <Card className="border-dashed border-muted-foreground/30">
            <CardHeader>
              <CardTitle className="text-base font-medium text-muted-foreground">{t('testCheckoutTitle')}</CardTitle>
              <CardDescription>{t('testCheckoutDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <CheckoutButton
                organizationId={orgId}
                subscribeLabel={t('testCheckoutButton')}
                redirectingLabel={t('redirecting')}
                variant="outline"
              />
            </CardContent>
          </Card>
          <BillingDebugSection orgId={orgId} />
        </>
      )}
    </div>
  );
}

async function BillingDebugSection({ orgId }: { orgId: string }) {
  const supabase = createAdminClient();
  const snapshot = await getOrganizationAccessSnapshot(supabase, orgId, true);
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, plan_id, stripe_price_id, status')
    .eq('organization_id', orgId)
    .maybeSingle();
  return (
    <Card className="border-dashed border-border bg-muted/50">
      <CardHeader>
        <CardTitle className="text-base font-medium text-muted-foreground">Billing debug (admin)</CardTitle>
        <CardDescription>Subscription, plan, usage, and entitlements snapshot.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 font-mono text-xs">
        <p><span className="text-muted-foreground">Subscription:</span> {sub?.status ?? '—'} | plan_id: {sub?.plan_id ?? 'null'} | price_id: {sub?.stripe_price_id ?? 'null'}</p>
        <p><span className="text-muted-foreground">Plan:</span> {snapshot.planSlug} ({snapshot.planName})</p>
        <p><span className="text-muted-foreground">Monthly:</span> messages={snapshot.richUsage.message_count}/{snapshot.richUsage.message_limit}, ai_actions={snapshot.richUsage.ai_action_count}/{snapshot.richUsage.ai_action_limit}</p>
        <p><span className="text-muted-foreground">Resources:</span> agents={snapshot.richUsage.agents_count}/{snapshot.richUsage.agents_limit}, widgets={snapshot.richUsage.widgets_count}/{snapshot.richUsage.widgets_limit}, sources={snapshot.richUsage.knowledge_sources_count}/{snapshot.richUsage.knowledge_sources_limit}, team={snapshot.richUsage.team_members_count}/{snapshot.richUsage.team_members_limit}</p>
        <p><span className="text-muted-foreground">Entitlements:</span> automations={String(snapshot.entitlements.automations_enabled)}, tools={String(snapshot.entitlements.tool_calling_enabled)}, voice={String(snapshot.entitlements.voice_enabled)}, api={String(snapshot.entitlements.api_access)}, ai_pages={String(snapshot.entitlements.ai_pages_enabled)}</p>
        {snapshot.usageWarnings.length > 0 && (
          <p className="text-amber-600 dark:text-amber-400">
            <span className="text-muted-foreground">Warnings:</span>{' '}
            {snapshot.usageWarnings.map((w) => `${w.metric}@${w.pct}%`).join(', ')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
