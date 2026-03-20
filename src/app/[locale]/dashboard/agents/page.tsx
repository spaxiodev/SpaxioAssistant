import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { getOrganizationAccessSnapshot, canCreateResourceFromSnapshot } from '@/lib/billing/access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/components/intl-link';
import { UsageLimitBanner } from '@/components/dashboard/usage-limit-banner';
import { Bot, Plus } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  website_chatbot: 'Website assistant',
  support_agent: 'Support',
  lead_qualification: 'Lead qualification',
  sales_agent: 'Sales',
  quote_assistant: 'Quote',
  faq_agent: 'FAQ',
  custom: 'Custom',
  // Deprecated (kept for display of existing agents): internal_knowledge, workflow_agent, booking_agent, follow_up_agent
  internal_knowledge: 'Internal knowledge',
  workflow_agent: 'Workflow',
  booking_agent: 'Booking',
  follow_up_agent: 'Follow-up',
};

export default async function AgentsPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');
  const adminAllowed = await isOrgAllowedByAdmin(supabase, orgId);
  const snapshot = await getOrganizationAccessSnapshot(supabase, orgId, adminAllowed);
  const agentCreateStatus = canCreateResourceFromSnapshot(snapshot, 'agents');
  const canCreateNewAgent = agentCreateStatus === 'allowed' || agentCreateStatus === 'warning';

  const { data: agents } = await supabase
    .from('agents')
    .select('id, name, description, role_type, widget_enabled, created_at, created_by_ai_setup')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('agents')}</h1>
          <p className="text-muted-foreground">{t('agentsDescription')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('agents')}</CardTitle>
          <CardDescription>
            Create and manage your website assistants. Each assistant can have its own instructions, tone, and (advanced) model/tools settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(agents?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No assistants yet. Your existing website assistant was migrated here; you can create more below.</p>
          ) : (
            <ul className="divide-y divide-border">
              {agents?.map((agent) => (
                <li key={agent.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{agent.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                        <Badge variant="secondary" className="font-normal">
                          {ROLE_LABELS[agent.role_type] ?? agent.role_type}
                        </Badge>
                        <span>OpenAI</span>
                        {agent.widget_enabled && (
                          <Badge variant="outline" className="font-normal">Widget on</Badge>
                        )}
                        {agent.created_by_ai_setup === true && (
                          <Badge variant="outline" className="font-normal">{t('agentCreatedByAiSetup')}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/agents/${agent.id}`}>Edit</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {(agentCreateStatus === 'limit_reached' || agentCreateStatus === 'requires_upgrade') && (
            <UsageLimitBanner
              resourceLabel="assistants"
              used={snapshot.richUsage.agents_count}
              limit={snapshot.richUsage.agents_limit}
              status={agentCreateStatus}
              className="mb-2"
            />
          )}
          <Button asChild disabled={!canCreateNewAgent}>
            <Link href={canCreateNewAgent ? '/dashboard/agents/new' : '#'}>
              <Plus className="mr-2 h-4 w-4" />
              Create assistant
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
