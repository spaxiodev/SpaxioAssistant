import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { hasActiveSubscription, canUseInbox, canUseAiActions, canUseBookings } from '@/lib/entitlements';
import { getPlanAccess } from '@/lib/plan-access';
import { getAnalyticsOverview } from '@/lib/analytics-overview';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, MessageSquare, FileText, Home, Inbox, Zap, Calendar, Lock, Workflow, Webhook, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/components/intl-link';
import { CheckoutButton } from '@/app/dashboard/billing/checkout-button';
import { buildUpgradeUrl, getUpgradePlanForFeature, FEATURE_LABELS } from '@/lib/plan-config';
export default async function DashboardOverviewPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');

  const { data: widgets } = await supabase.from('widgets').select('id').eq('organization_id', orgId);
  const widgetIds = (widgets ?? []).map((w) => w.id);

  const adminAllowed = await isOrgAllowedByAdmin(supabase, orgId);
  const planAccess = await getPlanAccess(supabase, orgId, adminAllowed);
  const [inboxEnabled, actionsEnabled, bookingsEnabled] = await Promise.all([
    canUseInbox(supabase, orgId, adminAllowed),
    canUseAiActions(supabase, orgId, adminAllowed),
    canUseBookings(supabase, orgId, adminAllowed),
  ]);

  const lockedFeatures = (['automations', 'webhooks', 'tool_calling'] as const).filter(
    (k) => !planAccess.featureAccess[k]
  );

  const [
    { count: leadsCount },
    { count: conversationsCount },
    { count: quoteRequestsCount },
    { data: subscription },
    overview,
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    widgetIds.length
      ? supabase.from('conversations').select('*', { count: 'exact', head: true }).in('widget_id', widgetIds)
      : { count: 0 },
    supabase.from('quote_requests').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('subscriptions').select('status, trial_ends_at').eq('organization_id', orgId).single(),
    getAnalyticsOverview(supabase, orgId, {
      inboxEnabled: inboxEnabled || adminAllowed,
      actionsEnabled: actionsEnabled || adminAllowed,
      bookingsEnabled: bookingsEnabled || adminAllowed,
      voiceEnabled: false,
    }),
  ]);

  const trialEnd = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
  const activeSub = await hasActiveSubscription(supabase, orgId, adminAllowed);
  const isTrialing = !adminAllowed && subscription?.status === 'trialing' && activeSub;
  const isActive = activeSub;

  const content = (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('overview')}</h1>
          <p className="text-muted-foreground">{t('overviewDescription')}</p>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href="/">
            <Home className="h-4 w-4" aria-hidden />
            {t('backToHome')}
          </Link>
        </Button>
      </div>

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

      {isTrialing && trialEnd && isActive && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="flex items-center justify-between pt-6">
            <p className="text-sm text-muted-foreground">
              {t('trialEnds', { date: trialEnd.toLocaleDateString() })}
            </p>
            <Button asChild>
              <Link href="/dashboard/billing">{t('upgrade')}</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('leads')}</CardTitle>
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{leadsCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              <Link href="/dashboard/leads" className="underline">{t('viewAllLeads')}</Link>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('conversations')}</CardTitle>
            <div className="rounded-full bg-muted p-2 text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{conversationsCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              <Link href="/dashboard/conversations" className="underline">{t('viewConversations')}</Link>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('quoteRequests')}</CardTitle>
            <div className="rounded-full bg-muted p-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{quoteRequestsCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              <Link href="/dashboard/quote-requests" className="underline">{t('viewQuoteRequests')}</Link>
            </p>
          </CardContent>
        </Card>
      </div>

      {lockedFeatures.length > 0 && (
        <Card className="border-dashed border-muted-foreground/30 bg-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Lock className="h-4 w-4" />
              {t('upgradeRequired')} — more on higher plans
            </CardTitle>
            <CardDescription className="text-xs">
              Upgrade to unlock these features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lockedFeatures.map((key) => (
                <Button key={key} asChild variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Link href={buildUpgradeUrl({ from: 'overview', current: planAccess.planSlug ?? undefined, recommended: getUpgradePlanForFeature(key) })}>
                    {key === 'automations' && <Workflow className="h-3.5 w-3.5" />}
                    {key === 'webhooks' && <Webhook className="h-3.5 w-3.5" />}
                    {key === 'tool_calling' && <Wrench className="h-3.5 w-3.5" />}
                    {FEATURE_LABELS[key]}
                  </Link>
                </Button>
              ))}
              <Button asChild variant="secondary" size="sm" className="text-xs">
                <Link href="/pricing">{t('viewPlans')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {(inboxEnabled || actionsEnabled || bookingsEnabled) && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {inboxEnabled && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('inbox')}</CardTitle>
                <div className="rounded-full bg-muted p-2 text-muted-foreground">
                  <Inbox className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{overview.inbox.conversations_open}</p>
                <p className="text-xs text-muted-foreground">
                  {overview.inbox.escalations_pending > 0
                    ? `${overview.inbox.escalations_pending} pending escalations · `
                    : ''}
                  <Link href="/dashboard/inbox" className="underline">{t('inbox')}</Link>
                </p>
              </CardContent>
            </Card>
          )}
          {actionsEnabled && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('aiActions')}</CardTitle>
                <div className="rounded-full bg-muted p-2 text-muted-foreground">
                  <Zap className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{overview.actions.invocations_last_30d}</p>
                <p className="text-xs text-muted-foreground">
                  Last 30 days · <Link href="/dashboard/actions" className="underline">{t('aiActions')}</Link>
                </p>
              </CardContent>
            </Card>
          )}
          {bookingsEnabled && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('bookings')}</CardTitle>
                <div className="rounded-full bg-muted p-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{overview.bookings.scheduled_or_confirmed}</p>
                <p className="text-xs text-muted-foreground">
                  Scheduled · <Link href="/dashboard/bookings" className="underline">{t('bookings')}</Link>
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card className="overflow-hidden bg-[linear-gradient(135deg,hsl(var(--card)),hsl(var(--primary)/0.08))]">
        <CardHeader>
          <CardTitle>{t('quickStart')}</CardTitle>
          <CardDescription>{t('quickStartDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/dashboard/install">{t('getInstallCode')}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  return content;
}
