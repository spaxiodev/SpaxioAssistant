import { getOrganizationId } from '@/lib/auth-server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Plus } from 'lucide-react';

export default async function NewAgentPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const t = await getTranslations('dashboard');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create agent</h1>
        <p className="text-muted-foreground">Add a new AI agent for your workspace.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New agent</CardTitle>
          <CardDescription>
            Choose a type (website chatbot, support, lead qualification, etc.), name, and model. You can attach the agent to a widget from the Install page after creation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Full create flow (form + API) is coming in the next update. For now, your existing website chat uses the default agent that was created when we upgraded. To add more agents, use the API: POST /api/agents with name, role_type, and optional system_prompt.
          </p>
          <Button asChild>
            <Link href="/dashboard/agents">
              <Plus className="mr-2 h-4 w-4" />
              Back to agents
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
