import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/components/intl-link';
import { notFound } from 'next/navigation';
import { Bot } from 'lucide-react';
import { AgentEnabledTools } from '@/app/dashboard/agents/agent-enabled-tools';
import { AgentDetailTabs } from '@/app/dashboard/agents/agent-detail-tabs';
import { AgentDeleteButton } from '@/app/dashboard/agents/agent-delete-button';
import { getPlanAccess } from '@/lib/plan-access';
import { isOrgAllowedByAdmin } from '@/lib/admin';

const ROLE_LABELS: Record<string, string> = {
  website_chatbot: 'Website Chat',
  support_agent: 'Support',
  lead_qualification: 'Lead qualification',
  internal_knowledge: 'Internal knowledge',
  workflow_agent: 'Workflow',
  sales_agent: 'Sales',
  booking_agent: 'Booking',
  quote_assistant: 'Quote Assistant',
  faq_agent: 'FAQ',
  follow_up_agent: 'Follow-up',
  custom: 'Custom',
};

type Props = { params: Promise<{ id: string }> };

export default async function AgentDetailPage({ params }: Props) {
  const { id } = await params;
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');

  const { data: agent, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single();

  if (error || !agent) notFound();

  const adminAllowed = await isOrgAllowedByAdmin(supabase, orgId);
  const planAccess = await getPlanAccess(supabase, orgId, adminAllowed);
  const toolCallingEnabled = planAccess.featureAccess.tool_calling;

  const [runsRes, widgetRes] = await Promise.all([
    supabase
      .from('agent_runs')
      .select('id, status, started_at, trigger_type, duration_ms')
      .eq('agent_id', id)
      .order('started_at', { ascending: false })
      .limit(20),
    supabase
      .from('widgets')
      .select('id')
      .eq('organization_id', orgId)
      .eq('agent_id', id)
      .limit(1)
      .maybeSingle(),
  ]);
  const runs = runsRes.data ?? [];
  const widgetId = widgetRes.data?.id ?? null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{agent.name}</h1>
          <p className="text-muted-foreground">{t('agentsDescription')}</p>
        </div>
        <div className="flex items-center gap-2">
          <AgentDeleteButton agentId={agent.id} agentName={agent.name} />
          <Button asChild variant="outline">
            <Link href="/dashboard/agents">Back to agents</Link>
          </Button>
        </div>
      </div>

      <AgentDetailTabs
        agentId={agent.id}
        agent={agent}
        defaultTab="overview"
        toolCallingEnabled={toolCallingEnabled}
        planName={planAccess.planName}
        overviewContent={
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle>{agent.name}</CardTitle>
                  <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Badge variant="secondary">{ROLE_LABELS[agent.role_type] ?? agent.role_type}</Badge>
                    <span>{agent.model_provider} / {agent.model_id}</span>
                    {agent.created_by_ai_setup === true && (
                      <>
                        <span className="text-muted-foreground/70">·</span>
                        <span className="text-muted-foreground">{t('agentCreatedByAiSetup')}</span>
                      </>
                    )}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {agent.description && (
                <p className="text-sm text-muted-foreground">{agent.description}</p>
              )}
              <dl className="grid gap-2 text-sm">
                <div>
                  <dt className="font-medium text-muted-foreground">Temperature</dt>
                  <dd>{agent.temperature}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Widget enabled</dt>
                  <dd>{agent.widget_enabled ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Webhook enabled</dt>
                  <dd>{agent.webhook_enabled ? 'Yes' : 'No'}</dd>
                </div>
              </dl>
              {toolCallingEnabled && (
                <div className="border-t border-border pt-4">
                  <AgentEnabledTools
                    agentId={agent.id}
                    initialEnabledIds={Array.isArray(agent.enabled_tools) ? agent.enabled_tools : []}
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Configure welcome message and branding in Settings and Deployments.
              </p>
            </CardContent>
          </Card>
        }
        runs={runs}
        widgetId={widgetId}
      />
    </div>
  );
}
