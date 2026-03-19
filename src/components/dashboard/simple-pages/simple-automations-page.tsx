'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Workflow, Sparkles, Bell, FileText, Ticket, Send } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  SimplePageHeader,
  SimpleActionCard,
  SimpleAiAssistPanel,
  SimpleEmptyState,
  SimpleDeveloperModeLink,
} from '@/components/dashboard/simple';
import { useViewMode } from '@/contexts/view-mode-context';

const INTENT_STORAGE_KEY = 'spaxio-ai-setup-intent';

type Automation = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  trigger_type?: string;
  action_type?: string;
  created_at?: string;
};

const RECIPE_LABELS: Record<string, { label: string; description: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }> = {
  new_lead: { label: 'Notify when a new lead arrives', description: 'Get an email or notification for each new lead.', icon: Bell },
  quote_request: { label: 'Save quote requests automatically', description: 'Store quote requests and optionally notify your team.', icon: FileText },
  support_ticket: { label: 'Create a support ticket when needed', description: 'When a visitor asks for help, create a ticket.', icon: Ticket },
  follow_up: { label: 'Automatic follow-up', description: 'Automatically reply to new leads and quote requests with templates or AI drafts.', icon: Send },
};

export function SimpleAutomationsPage() {
  const router = useRouter();
  const { setMode } = useViewMode();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const openInDeveloperMode = (path: string) => {
    setMode('developer');
    router.push(path);
  };

  useEffect(() => {
    let cancelled = false;
    fetch('/api/automations')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setAutomations(Array.isArray(data.automations) ? data.automations : []);
      })
      .catch(() => {
        if (!cancelled) setAutomations([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = async (id: string, currentStatus: string) => {
    setTogglingId(id);
    try {
      const res = await fetch(`/api/automations/${id}/toggle`, { method: 'POST' });
      if (res.ok) {
        const next = currentStatus === 'active' ? 'paused' : 'active';
        setAutomations((prev) => prev.map((a) => (a.id === id ? { ...a, status: next } : a)));
      }
    } catch {
      // ignore
    } finally {
      setTogglingId(null);
    }
  };

  const goToAiSetup = (prompt: string) => {
    try {
      window.localStorage.setItem(INTENT_STORAGE_KEY, prompt);
    } catch {
      // ignore
    }
    router.push('/dashboard/ai-setup');
  };

  return (
    <div className="space-y-8">
      <SimplePageHeader
        title="What should happen automatically?"
        description="Choose what happens after a customer action: get notified, save leads, create tickets, or send reminders."
        icon={<Workflow className="h-6 w-6" />}
      />

      {/* Recipe-style automation ideas */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(RECIPE_LABELS).map(([key, { label, description, icon: Icon }]) => (
          <SimpleActionCard key={key} title={label} description={description} icon={<Icon className="h-5 w-5" />}>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => goToAiSetup(`Create an automation: ${label}. ${description}`)}
            >
              Set up this automation
            </Button>
          </SimpleActionCard>
        ))}
      </div>

      {/* Your automations list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your automations</CardTitle>
          <CardDescription>
            {loading ? 'Loading…' : automations.length === 0 ? 'No automations yet. Use the cards above or AI to create one.' : 'Turn automations on or off, or open in Developer Mode to edit.'}
          </CardDescription>
        </CardHeader>
        {!loading && automations.length > 0 && (
          <CardContent className="space-y-3">
            {automations.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 p-3"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{a.name}</p>
                  {a.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{a.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={a.status === 'active' ? 'default' : 'secondary'}>
                    {a.status === 'active' ? 'On' : 'Paused'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={togglingId === a.id}
                    onClick={() => handleToggle(a.id, a.status)}
                  >
                    {a.status === 'active' ? 'Pause' : 'Turn on'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openInDeveloperMode('/dashboard/automations')}>
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        )}
        {!loading && automations.length === 0 && (
          <CardContent>
            <SimpleEmptyState
              icon={<Workflow className="h-10 w-10" />}
              title="No automations yet"
              description="Set up notifications, lead saving, or follow-up reminders using the options above or describe what you want to AI."
              action={{ label: 'Describe what you want', onClick: () => goToAiSetup('Create automations for me. When someone becomes a lead, notify me. When they ask for a quote, save it.') }}
              showDeveloperModeSwitch={true}
            />
          </CardContent>
        )}
      </Card>

      <SimpleAiAssistPanel
        title="AI can help"
        description="Describe what you want to happen automatically, or get recommendations."
        actions={[
          { label: 'Describe what you want to happen', onClick: () => goToAiSetup('Create automations: when a new lead arrives email me; when someone asks for a quote save it and notify the team.') },
          { label: 'Recommend automations for my business', onClick: () => goToAiSetup('Recommend the best automations for my type of business.') },
        ]}
      />

      <SimpleDeveloperModeLink developerPath="/dashboard/automations" linkLabel="Open Automations in Developer Mode" />
    </div>
  );
}
