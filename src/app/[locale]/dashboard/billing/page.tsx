import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isOrgAllowedByAdmin } from '@/lib/admin';
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
  const isActive =
    adminAllowed ||
    subscription?.status === 'active' ||
    subscription?.status === 'trialing';
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
          <CardDescription>{t('currentPlanDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-medium">{t('monthly')}</span>
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
        </CardContent>
      </Card>

      {adminAllowed && (
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
      )}
    </div>
  );
}
