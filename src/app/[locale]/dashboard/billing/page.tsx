import { getOrganizationId } from '@/lib/auth-server';
import { Link } from '@/components/intl-link';
import { createAdminClient } from '@/lib/supabase/admin';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { getOrganizationSubscriptionAccess } from '@/lib/billing/subscription-access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckoutButton } from '@/app/dashboard/billing/checkout-button';
import { getTranslations } from 'next-intl/server';
import { Progress } from '@/components/ui/progress';

export default async function BillingPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');
  const adminAllowed = await isOrgAllowedByAdmin(supabase, orgId);
  const access = await getOrganizationSubscriptionAccess(supabase, orgId, adminAllowed);

  const isActive = access.isActive;
  const planName = access.planName;
  const trialEnd = access.trialEndsAt ? new Date(access.trialEndsAt) : null;
  const periodEnd = access.currentPeriodEnd ? new Date(access.currentPeriodEnd) : null;
  const hasStripeSubscription = access.billingStatus === 'active' || access.billingStatus === 'trialing';
  const subscription = { status: access.billingStatus, trial_ends_at: access.trialEndsAt, current_period_end: access.currentPeriodEnd };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('billingTitle')}</h1>
        <p className="text-muted-foreground">{t('billingDescription')}</p>
      </div>

      {/* Prominent upgrade CTA when not subscribed */}
      {!isActive && (
        <Card className="border-2 border-primary bg-primary/5 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">{t('upgradeCtaTitle')}</CardTitle>
            <CardDescription className="text-base">{t('upgradeCtaDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <CheckoutButton
              organizationId={orgId}
              subscribeLabel={t('upgrade')}
              redirectingLabel={t('redirecting')}
              className="rounded-lg px-6 py-6 text-base font-semibold"
            />
          </CardContent>
        </Card>
      )}

      {/* Assistant Pro plan option */}
      <Card className="border-primary/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t('assistantProPlanName')}
            <Badge variant="secondary" className="font-normal">
              {t('assistantProDescription')}
            </Badge>
          </CardTitle>
          <CardDescription>{t('currentPlanDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isActive ? (
            <CheckoutButton
              organizationId={orgId}
              subscribeLabel={t('subscribeNow')}
              redirectingLabel={t('redirecting')}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {adminAllowed && t('adminFree')}
              {!adminAllowed && subscription?.status === 'trialing' && trialEnd && t('freeTrialEnds', { date: trialEnd.toLocaleDateString() })}
              {!adminAllowed && subscription?.status === 'active' && periodEnd && t('currentPeriodEnds', { date: periodEnd.toLocaleDateString() })}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('currentPlan')}</CardTitle>
          <CardDescription>
            {planName} — {t('currentPlanDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{planName}</span>
            <Badge variant={isActive ? 'default' : 'secondary'}>
              {adminAllowed ? t('adminFree') : (subscription?.status ?? t('none'))}
            </Badge>
          </div>
          {trialEnd && subscription?.status === 'trialing' && (
            <p className="text-sm text-muted-foreground">
              {t('freeTrialEnds', { date: trialEnd.toLocaleDateString() })}
            </p>
          )}
          {periodEnd && subscription?.status === 'active' && (
            <p className="text-sm text-muted-foreground">
              {t('currentPeriodEnds', { date: periodEnd.toLocaleDateString() })}
            </p>
          )}
          {!isActive && (
            <CheckoutButton
              organizationId={orgId}
              subscribeLabel={t('subscribeNow')}
              redirectingLabel={t('redirecting')}
            />
          )}
          {hasStripeSubscription && (
            <form action="/api/billing/portal" method="POST" className="space-y-1">
              <input type="hidden" name="organizationId" value={orgId} />
              <Button type="submit" variant="outline" className="rounded-lg" title={t('manageSubscriptionHint')}>
                {t('manageSubscription')}
              </Button>
              <p className="text-xs text-muted-foreground">{t('manageSubscriptionHint')}</p>
            </form>
          )}
          <p className="text-sm text-muted-foreground">
            <Link href="/pricing" className="underline hover:no-underline">
              View all plans
            </Link>
          </p>
        </CardContent>
      </Card>

      {/* Usage this period */}
      <Card>
        <CardHeader>
          <CardTitle>{t('usageThisPeriod')}</CardTitle>
          <CardDescription>
            {t('usagePeriodDescription', {
              start: new Date(access.usage.period_start).toLocaleDateString(),
              end: new Date(access.usage.period_end).toLocaleDateString(),
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('messages')}</span>
              <span>
                {access.usage.message_count} / {access.usage.message_limit === 0 ? '∞' : access.usage.message_limit}
              </span>
            </div>
            {access.usage.message_limit > 0 && (
              <Progress
                value={
                  access.usage.message_limit > 0
                    ? Math.min(100, (access.usage.message_count / access.usage.message_limit) * 100)
                    : 0
                }
                className="h-2"
              />
            )}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('aiActions')}</span>
              <span>
                {access.usage.ai_action_count} / {access.usage.ai_action_limit === 0 ? '∞' : access.usage.ai_action_limit}
              </span>
            </div>
            {access.usage.ai_action_limit > 0 && (
              <Progress
                value={
                  access.usage.ai_action_limit > 0
                    ? Math.min(100, (access.usage.ai_action_count / access.usage.ai_action_limit) * 100)
                    : 0
                }
                className="h-2"
              />
            )}
          </div>
          {access.blockedReasons.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium">{access.blockedReasons[0].message}</p>
              <Link href="/pricing" className="mt-2 inline-block font-medium underline">
                {t('upgrade')}
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

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

/** Admin-only: subscription status, plan, entitlements snapshot, usage (for debugging webhook sync). */
async function BillingDebugSection({ orgId }: { orgId: string }) {
  const supabase = createAdminClient();
  const adminAllowed = true;
  const access = await getOrganizationSubscriptionAccess(supabase, orgId, adminAllowed);
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, plan_id, stripe_price_id, status')
    .eq('organization_id', orgId)
    .maybeSingle();
  return (
    <Card className="border-dashed border-border bg-muted/50">
      <CardHeader>
        <CardTitle className="text-base font-medium text-muted-foreground">Billing debug (admin)</CardTitle>
        <CardDescription>Subscription, plan, and usage for webhook/diagnostic use.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 font-mono text-xs">
        <p><span className="text-muted-foreground">Subscription:</span> {sub?.status ?? '—'} | plan_id: {sub?.plan_id ?? 'null'} | price_id: {sub?.stripe_price_id ?? 'null'}</p>
        <p><span className="text-muted-foreground">Plan:</span> {access.planSlug} ({access.planName})</p>
        <p><span className="text-muted-foreground">Usage this period:</span> messages={access.usage.message_count}, ai_actions={access.usage.ai_action_count}</p>
        <p><span className="text-muted-foreground">Limits:</span> max_agents={access.entitlements.max_agents}, monthly_messages={access.entitlements.monthly_messages}, tool_calling={String(access.entitlements.tool_calling_enabled)}, ai_pages_enabled={String(access.entitlements.ai_pages_enabled)}</p>
      </CardContent>
    </Card>
  );
}
