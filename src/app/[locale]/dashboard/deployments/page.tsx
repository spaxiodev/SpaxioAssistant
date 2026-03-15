import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getTranslations } from 'next-intl/server';
import { Code, Bot } from 'lucide-react';
import { Link } from '@/components/intl-link';

export default async function DeploymentsPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');

  const [{ data: configs }, { data: agents }] = await Promise.all([
    supabase
      .from('deployment_configs')
      .select('id, agent_id, deployment_type, created_at, agents(name)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false }),
    supabase.from('agents').select('id, name').eq('organization_id', orgId).order('name'),
  ]);

  const hasAgents = (agents?.length ?? 0) > 0;
  const hasConfigs = (configs?.length ?? 0) > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('deployments')}</h1>
        <p className="text-muted-foreground">{t('deploymentsDescription')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deployment surfaces</CardTitle>
          <CardDescription>
            Deploy agents as website widget, embedded chat, standalone page, or API. Configure appearance, welcome message, and domain restrictions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasConfigs ? (
            <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 p-8 text-center">
              <Code className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                {hasAgents ? t('deploymentsNoConfigsWithAgents') : t('deploymentsNoConfigsNoAgents')}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {hasAgents ? t('deploymentsAddFromAgentTab') : t('deploymentsCreateAgentFirst')}
              </p>
              {hasAgents ? (
                <ul className="mt-4 space-y-2">
                  {(agents ?? []).map((agent) => (
                    <li key={agent.id}>
                      <Link
                        href={`/dashboard/agents/${agent.id}`}
                        className="inline-flex items-center gap-2 text-sm font-medium text-primary underline"
                      >
                        <Bot className="h-4 w-4" />
                        {agent.name}
                      </Link>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {t('deploymentsOpenAgentDeploymentTab')}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Link
                  href="/dashboard/agents/new"
                  className="mt-4 inline-block text-sm font-medium text-primary underline"
                >
                  {t('createAgent')}
                </Link>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {(configs ?? []).map((c) => (
                <li key={c.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <Bot className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {(Array.isArray(c.agents) ? (c.agents[0] as { name?: string })?.name : (c.agents as { name?: string } | null)?.name) ?? 'Agent'}
                      </p>
                      <p className="text-xs text-muted-foreground">{c.deployment_type}</p>
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/agents/${c.agent_id}`}
                    className="text-sm text-primary underline"
                  >
                    {t('edit')}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
