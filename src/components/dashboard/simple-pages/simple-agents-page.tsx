'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Sparkles, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
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

type Agent = {
  id: string;
  name: string;
  description: string | null;
  widget_enabled: boolean;
  created_at?: string;
};

export function SimpleAgentsPage() {
  const router = useRouter();
  const { setMode } = useViewMode();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const openInDeveloperMode = (path: string) => {
    setMode('developer');
    router.push(path);
  };

  useEffect(() => {
    let cancelled = false;
    fetch('/api/agents')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setAgents(Array.isArray(data?.agents) ? data.agents : []);
      })
      .catch(() => {
        if (!cancelled) setAgents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = async (agentId: string, current: boolean) => {
    setTogglingId(agentId);
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widget_enabled: !current }),
      });
      if (res.ok) {
        setAgents((prev) =>
          prev.map((a) => (a.id === agentId ? { ...a, widget_enabled: !current } : a))
        );
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
        title="Your assistants"
        description="Each assistant powers a chat experience. Set its purpose, turn it on or off, and choose where it appears."
        icon={<Bot className="h-6 w-6" />}
      />

      {/* Manual: create assistant types */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SimpleActionCard
          title="Sales assistant"
          description="Helps visitors learn about your offer and captures leads."
          icon={<Bot className="h-5 w-5" />}
        >
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => goToAiSetup('Create a sales assistant that captures leads and answers questions about my services.')}
          >
            <Plus className="h-4 w-4" />
            Create sales assistant
          </Button>
        </SimpleActionCard>
        <SimpleActionCard
          title="Support assistant"
          description="Answers common questions and helps with support."
          icon={<Bot className="h-5 w-5" />}
        >
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => goToAiSetup('Create a support assistant that answers FAQs and helps customers.')}
          >
            <Plus className="h-4 w-4" />
            Create support assistant
          </Button>
        </SimpleActionCard>
        <SimpleActionCard
          title="Quote assistant"
          description="Collects project details and sends quote requests."
          icon={<Bot className="h-5 w-5" />}
        >
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => goToAiSetup('Create an assistant that collects quote requests and project details.')}
          >
            <Plus className="h-4 w-4" />
            Create quote assistant
          </Button>
        </SimpleActionCard>
      </div>

      {/* List of assistants */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your assistants</CardTitle>
          <CardDescription>
            {loading ? 'Loading…' : agents.length === 0 ? 'No assistants yet. Create one above or use AI to set up.' : 'Turn an assistant on or off, or open in Developer Mode to edit.'}
          </CardDescription>
        </CardHeader>
        {!loading && agents.length > 0 && (
          <CardContent className="space-y-3">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 p-3"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{agent.name}</p>
                  {agent.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{agent.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={agent.widget_enabled ? 'default' : 'secondary'}>
                    {agent.widget_enabled ? 'On' : 'Off'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={togglingId === agent.id}
                    onClick={() => handleToggle(agent.id, agent.widget_enabled)}
                  >
                    {agent.widget_enabled ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openInDeveloperMode('/dashboard/agents')}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        )}
        {!loading && agents.length === 0 && (
          <CardContent>
            <SimpleEmptyState
              icon={<Bot className="h-10 w-10" />}
              title="No assistants yet"
              description="Create a sales, support, or quote assistant above, or use AI to recommend and create one."
              action={{ label: 'Set up with AI', onClick: () => goToAiSetup('Recommend and create assistants for my business.') }}
              showDeveloperModeSwitch={true}
            />
          </CardContent>
        )}
      </Card>

      <SimpleAiAssistPanel
        title="AI can help"
        description="Get suggestions or have AI write instructions for your assistant."
        actions={[
          { label: 'Recommend assistants for my business', onClick: () => goToAiSetup('Recommend the right assistants for my business type.') },
          { label: 'Write assistant instructions for me', onClick: () => goToAiSetup('Write clear instructions and tone for my assistant.') },
        ]}
      />

      <SimpleDeveloperModeLink developerPath="/dashboard/agents" linkLabel="Open Assistants in Developer Mode" />
    </div>
  );
}
