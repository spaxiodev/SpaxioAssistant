import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Bot, Plus } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  website_chatbot: 'Website Chat',
  support_agent: 'Support',
  lead_qualification: 'Lead qualification',
  internal_knowledge: 'Internal knowledge',
  workflow_agent: 'Workflow',
  custom: 'Custom',
};

export default async function AgentsPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');

  const { data: agents } = await supabase
    .from('agents')
    .select('id, name, description, role_type, model_id, widget_enabled, created_at')
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
            Create AI workers for your business: website chat, support, lead qualification, and more. Each agent can have its own prompt, model, and tools.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(agents?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No agents yet. Your existing website chatbot was migrated to an agent; you can create more below.</p>
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
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="secondary" className="font-normal">
                          {ROLE_LABELS[agent.role_type] ?? agent.role_type}
                        </Badge>
                        <span>{agent.model_id}</span>
                        {agent.widget_enabled && (
                          <Badge variant="outline" className="font-normal">Widget on</Badge>
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
          <Button asChild>
            <Link href="/dashboard/agents/new">
              <Plus className="mr-2 h-4 w-4" />
              Create agent
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
