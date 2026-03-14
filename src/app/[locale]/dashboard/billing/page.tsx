import { getOrganizationId } from '@/lib/auth-server';
import { Link } from '@/i18n/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { hasActiveSubscription, getPlanForOrg, getEntitlements, getCurrentUsage } from '@/lib/entitlements';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckoutButton } from '@/app/dashboard/billing/checkout-button';
import { getTranslations } from 'next-intl/server';

export default async function BillingPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, trial_ends_at, current_period_end')
    .eq('organization_id', orgId)
    .single();

  const adminAllowed = await isOrgAllowedByAdmin(supabase, orgId);
  const isActive = await hasActiveSubscription(supabase, orgId, adminAllowed);
  const plan = await getPlanForOrg(supabase, orgId);
  const planName = plan?.name ?? 'Free';
  const trialEnd = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
  const periodEnd = subscription?.current_period_end ? new Date(subscription.current_period_end) : null;

  const hasStripeSubscription = subscription?.status === 'active' || subscription?.status === 'trialing';

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
  const [{ data: sub }, plan, { entitlements }, usage] = await Promise.all([
    supabase.from('subscriptions').select('id, plan_id, stripe_price_id, status').eq('organization_id', orgId).maybeSingle(),
    getPlanForOrg(supabase, orgId),
    getEntitlements(supabase, orgId),
    getCurrentUsage(supabase, orgId),
  ]);
  return (
    <Card className="border-dashed border-border bg-muted/50">
      <CardHeader>
        <CardTitle className="text-base font-medium text-muted-foreground">Billing debug (admin)</CardTitle>
        <CardDescription>Subscription, plan, and usage for webhook/diagnostic use.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 font-mono text-xs">
        <p><span className="text-muted-foreground">Subscription:</span> {sub?.status ?? '—'} | plan_id: {sub?.plan_id ?? 'null'} | price_id: {sub?.stripe_price_id ?? 'null'}</p>
        <p><span className="text-muted-foreground">Plan:</span> {plan?.slug ?? '—'} ({plan?.name ?? '—'})</p>
        <p><span className="text-muted-foreground">Usage this period:</span> messages={usage.message_count}, ai_actions={usage.ai_action_count} | agents={usage.agents_count}, sources={usage.knowledge_sources_count}</p>
        <p><span className="text-muted-foreground">Limits:</span> max_agents={entitlements.max_agents}, monthly_messages={entitlements.monthly_messages}, tool_calling={String(entitlements.tool_calling_enabled)}</p>
      </CardContent>
    </Card>
  );
}
