import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, MessageSquare, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { CheckoutButton } from '@/app/dashboard/billing/checkout-button';

export default async function DashboardOverviewPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');

  const { data: widgets } = await supabase.from('widgets').select('id').eq('organization_id', orgId);
  const widgetIds = (widgets ?? []).map((w) => w.id);

  const [
    { count: leadsCount },
    { count: conversationsCount },
    { count: quoteRequestsCount },
    { data: subscription },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    widgetIds.length
      ? supabase.from('conversations').select('*', { count: 'exact', head: true }).in('widget_id', widgetIds)
      : { count: 0 },
    supabase.from('quote_requests').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('subscriptions').select('status, trial_ends_at').eq('organization_id', orgId).single(),
  ]);

  const adminAllowed = await isOrgAllowedByAdmin(supabase, orgId);
  const trialEnd = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
  const isTrialing = !adminAllowed && subscription?.status === 'trialing';
  const isActive =
    adminAllowed ||
    subscription?.status === 'active' ||
    subscription?.status === 'trialing';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('overview')}</h1>
        <p className="text-muted-foreground">{t('overviewDescription')}</p>
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
            <div className="rounded-full bg-cyan-500/10 p-2 text-cyan-600 dark:text-cyan-300">
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
            <div className="rounded-full bg-amber-500/10 p-2 text-amber-600 dark:text-amber-300">
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
}
