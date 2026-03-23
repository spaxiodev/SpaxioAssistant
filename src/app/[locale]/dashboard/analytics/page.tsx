import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getTranslations } from 'next-intl/server';
import { BarChart3, MessageSquare, Users, FileText, Workflow } from 'lucide-react';
import { Link } from '@/components/intl-link';

export default async function AnalyticsPage() {
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
    { count: automationRunsCount },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    widgetIds.length
      ? supabase.from('conversations').select('*', { count: 'exact', head: true }).in('widget_id', widgetIds)
      : { count: 0 },
    supabase.from('quote_requests').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase
      .from('automation_runs')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId),
  ]);

  let messagesCount: number | null = 0;
  if (widgetIds.length > 0) {
    const { data: convs } = await supabase
      .from('conversations')
      .select('id')
      .in('widget_id', widgetIds);
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
    .limit(10);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('analytics')}</h1>
        <p className="text-muted-foreground">{t('analyticsDescription')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('conversations')}</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
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
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{messagesCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total in all conversations</p>
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
              <Link href="/dashboard/leads" className="underline">{t('viewAllLeads')}</Link>
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
              <Link href="/dashboard/quote-requests" className="underline">{t('viewQuoteRequests')}</Link>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Automation runs</CardTitle>
            <Workflow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{automationRunsCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              <Link href="/dashboard/automations" className="underline">View automations</Link>
            </p>
          </CardContent>
        </Card>
      </div>

      {recentRuns && recentRuns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent automation runs</CardTitle>
            <CardDescription>Latest workflow executions across your automations.</CardDescription>
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
    </div>
  );
}
