import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { hasActiveSubscription } from '@/lib/entitlements';
import { getPlanAccess } from '@/lib/plan-access';
import { getOrganizationAccessSnapshot } from '@/lib/billing/access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  MessageSquare,
  FileText,
  Home,
  AlertTriangle,
  Workflow,
  BarChart3,
  Search,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/components/intl-link';
import { CheckoutButton } from '@/app/dashboard/billing/checkout-button';

/**
 * Developer Mode overview: metrics-forward control room (same data as the rest of the app).
 */
export async function DeveloperDashboardOverview() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');

  const { data: widgets } = await supabase.from('widgets').select('id').eq('organization_id', orgId);
  const widgetIds = (widgets ?? []).map((w) => w.id);

  const adminAllowed = await isOrgAllowedByAdmin(supabase, orgId);
  const [, snapshot] = await Promise.all([
    getPlanAccess(supabase, orgId, adminAllowed),
    getOrganizationAccessSnapshot(supabase, orgId, adminAllowed),
  ]);

  const [
    { count: leadsCount },
    { count: conversationsCount },
    { count: quoteRequestsCount },
    { count: automationRunsCount },
    { data: subscription },
    { count: knowledgeCount },
    { count: agentsCount },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    widgetIds.length
      ? supabase.from('conversations').select('*', { count: 'exact', head: true }).in('widget_id', widgetIds)
      : { count: 0 },
    supabase.from('quote_requests').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('automation_runs').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('subscriptions').select('status, trial_ends_at').eq('organization_id', orgId).single(),
    supabase.from('knowledge_sources').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('agents').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
  ]);

  let messagesCount: number | null = 0;
  if (widgetIds.length > 0) {
    const { data: convs } = await supabase.from('conversations').select('id').in('widget_id', widgetIds);
    const convIds = (convs ?? []).map((c) => c.id);
    if (convIds.length > 0) {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', convIds);
      messagesCount = count;
    }
  }

  const { data: recentRuns } = await supabase
    .from('automation_runs')
    .select('id, status, started_at, automations(name)')
    .eq('organization_id', orgId)
    .order('started_at', { ascending: false })
    .limit(8);

  const { data: businessRow } = await supabase
    .from('business_settings')
    .select('business_name, website_url, website_learned_at')
    .eq('organization_id', orgId)
    .single();

  const trialEnd = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
  const activeSub = await hasActiveSubscription(supabase, orgId, adminAllowed);
  const isTrialing = !adminAllowed && subscription?.status === 'trialing' && activeSub;
  const isActive = activeSub;

  const setupIssues: string[] = [];
  if (!businessRow?.business_name?.trim()) setupIssues.push('Business name missing in Settings');
  if (!businessRow?.website_url?.trim()) setupIssues.push('Website URL not set (optional but recommended)');
  if ((agentsCount ?? 0) === 0) setupIssues.push('No AI assistant created yet');
  if ((knowledgeCount ?? 0) === 0 && !businessRow?.website_learned_at) {
    setupIssues.push('No knowledge sources or completed site learning');
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('navDevOverview')}</h1>
          <p className="text-muted-foreground">{t('developerOverviewSubtitle')}</p>
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
            <p className="text-sm text-muted-foreground">{t('trialEnds', { date: trialEnd.toLocaleDateString() })}</p>
            <Button asChild>
              <Link href="/dashboard/billing">{t('upgrade')}</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!adminAllowed && snapshot.usageWarnings.length > 0 && (
        <Card
          className={
            snapshot.usageWarnings.some((w) => w.level === 'limit_reached')
              ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20'
              : 'border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20'
          }
        >
          <CardContent className="flex flex-wrap items-start gap-3 pt-4">
            <AlertTriangle
              className={
                snapshot.usageWarnings.some((w) => w.level === 'limit_reached')
                  ? 'mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400'
                  : 'mt-0.5 h-5 w-5 shrink-0 text-orange-600 dark:text-orange-400'
              }
            />
            <div className="flex-1 space-y-1">
              <p
                className={
                  snapshot.usageWarnings.some((w) => w.level === 'limit_reached')
                    ? 'font-medium text-red-900 dark:text-red-200'
                    : 'font-medium text-orange-900 dark:text-orange-200'
                }
              >
                {snapshot.usageWarnings[0].message}
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/billing">View usage</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {setupIssues.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base">{t('developerSetupWarnings')}</CardTitle>
            </div>
            <CardDescription>{t('developerSetupWarningsHint')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {setupIssues.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <Button asChild size="sm" variant="outline" className="mt-4">
              <Link href="/dashboard/settings">{t('settingsTitle')}</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('conversations')}</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{conversationsCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              <Link href="/dashboard/conversations" className="underline">
                {t('viewConversations')}
              </Link>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{messagesCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">Across all conversations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('leads')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{leadsCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              <Link href="/dashboard/leads" className="underline">
                {t('viewAllLeads')}
              </Link>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('quoteRequests')}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{quoteRequestsCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              <Link href="/dashboard/quote-requests" className="underline">
                {t('viewQuoteRequests')}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Automation runs</CardTitle>
            <Workflow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{automationRunsCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              <Link href="/dashboard/automations" className="underline">
                {t('automations')}
              </Link>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('aiSearch')}</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Search performance, ranking, and fallbacks live on the AI Search Agent page.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href="/dashboard/ai-search">Open AI Search</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {recentRuns && recentRuns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('recentRuns')}</CardTitle>
            <CardDescription>{t('recentRunsDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {recentRuns.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                  <span className="text-sm font-medium">
                    {(Array.isArray(r.automations)
                      ? (r.automations[0] as { name?: string } | undefined)?.name
                      : (r.automations as { name?: string } | null)?.name) ?? 'Automation'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {r.status} · {new Date(r.started_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden bg-[linear-gradient(135deg,hsl(var(--card)),hsl(var(--primary)/0.08))]">
        <CardHeader>
          <CardTitle>{t('quickStart')}</CardTitle>
          <CardDescription>{t('quickStartDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/dashboard/install">{t('getInstallCode')}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/analytics">{t('navDevAnalytics')}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
