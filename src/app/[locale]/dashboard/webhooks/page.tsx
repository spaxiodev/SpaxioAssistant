import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getTranslations } from 'next-intl/server';
import { WebhooksClient } from '@/app/dashboard/webhooks/webhooks-client';

export default async function WebhooksPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');

  const [
    { data: endpointsRaw },
    { data: agents },
  ] = await Promise.all([
    supabase
      .from('webhook_endpoints')
      .select('id, name, slug, active, last_success_at, last_failure_at, last_failure_message, created_at, agent_id, agents(name)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false }),
    supabase
      .from('agents')
      .select('id, name')
      .eq('organization_id', orgId)
      .order('name'),
  ]);

  const endpoints = (endpointsRaw ?? []).map((row) => {
    const agents = (row as unknown as { agents?: { name: string } | { name: string }[] | null }).agents;
    const agent_name = agents == null ? null : Array.isArray(agents) ? agents[0]?.name ?? null : agents.name;
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      active: row.active,
      last_success_at: row.last_success_at,
      last_failure_at: row.last_failure_at,
      last_failure_message: row.last_failure_message,
      created_at: row.created_at,
      agent_id: row.agent_id ?? null,
      agent_name,
    };
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('webhooks')}</h1>
        <p className="text-muted-foreground">{t('webhooksDescription')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('webhooks')}</CardTitle>
          <CardDescription>
            Create webhook endpoints per agent or workspace-level. Use the URL in external systems to send data into Spaxio. Optionally map payload fields to internal variables for automations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WebhooksClient
            initialEndpoints={endpoints}
            initialAgents={agents ?? []}
            baseUrl={process.env.NEXT_PUBLIC_APP_URL ?? ''}
          />
        </CardContent>
      </Card>
    </div>
  );
}
