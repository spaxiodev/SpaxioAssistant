'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UpgradeRequiredCard } from '@/components/upgrade-required-card';
import { AgentEnabledTools } from '@/app/dashboard/agents/agent-enabled-tools';
import { AgentInstructionsTab } from '@/app/dashboard/agents/agent-instructions-tab';
import { AgentKnowledgeTab } from '@/app/dashboard/agents/agent-knowledge-tab';
import { AgentMemoryTab } from '@/app/dashboard/agents/agent-memory-tab';
import { AgentDeploymentTab } from '@/app/dashboard/agents/agent-deployment-tab';
import { AgentTestingTab } from '@/app/dashboard/agents/agent-testing-tab';

type RunRow = { id: string; status: string; started_at: string; trigger_type: string | null; duration_ms?: number | null };

type AgentForTabs = {
  id: string;
  name: string;
  system_prompt?: string | null;
  goal?: string | null;
  tone?: string | null;
  fallback_behavior?: string | null;
  escalation_behavior?: string | null;
  enabled_tools?: string[] | null;
  linked_knowledge_source_ids?: string[] | null;
  memory_short_term_enabled?: boolean;
  memory_long_term_enabled?: boolean;
  widget_enabled?: boolean;
};

type AgentDetailTabsProps = {
  agentId: string;
  agent: AgentForTabs;
  defaultTab: string;
  toolCallingEnabled: boolean;
  planName: string;
  overviewContent: React.ReactNode;
  runs: RunRow[];
  widgetId?: string | null;
};

const TAB_KEYS = [
  'overview',
  'instructions',
  'tools',
  'knowledge',
  'memory',
  'deployment',
  'testing',
  'analytics',
] as const;

const TAB_LABELS: Record<(typeof TAB_KEYS)[number], string> = {
  overview: 'Overview',
  instructions: 'Instructions',
  tools: 'Tools',
  knowledge: 'Knowledge',
  memory: 'Memory',
  deployment: 'Deployment',
  testing: 'Testing',
  analytics: 'Analytics',
};

export function AgentDetailTabs({ agentId, agent, defaultTab, toolCallingEnabled, planName, overviewContent, runs, widgetId }: AgentDetailTabsProps) {
  const enabledIds = Array.isArray(agent.enabled_tools) ? agent.enabled_tools : [];
  const linkedIds = Array.isArray(agent.linked_knowledge_source_ids) ? agent.linked_knowledge_source_ids : [];

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="flex h-auto flex-wrap gap-1 bg-muted/50 p-1">
        {TAB_KEYS.map((key) => (
          <TabsTrigger key={key} value={key} className="text-sm">
            {TAB_LABELS[key]}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="overview" className="mt-6">
        {overviewContent}
      </TabsContent>

      <TabsContent value="instructions" className="mt-6">
        <AgentInstructionsTab agent={agent} />
      </TabsContent>

      <TabsContent value="tools" className="mt-6">
        {toolCallingEnabled ? (
          <Card>
            <CardHeader>
              <CardTitle>Tools</CardTitle>
              <CardDescription>Enabled tools and allowed actions for this agent.</CardDescription>
            </CardHeader>
            <CardContent>
              <AgentEnabledTools agentId={agentId} initialEnabledIds={enabledIds} />
            </CardContent>
          </Card>
        ) : (
          <UpgradeRequiredCard
            featureKey="tool_calling"
            currentPlanName={planName}
            from="agent-tools"
          />
        )}
      </TabsContent>

      <TabsContent value="knowledge" className="mt-6">
        <AgentKnowledgeTab agentId={agentId} initialLinkedIds={linkedIds} />
      </TabsContent>

      <TabsContent value="memory" className="mt-6">
        <AgentMemoryTab
          agentId={agentId}
          initialShortTerm={!!agent.memory_short_term_enabled}
          initialLongTerm={!!agent.memory_long_term_enabled}
        />
      </TabsContent>

      <TabsContent value="deployment" className="mt-6">
        <AgentDeploymentTab
          agentId={agentId}
          agentName={agent.name}
          widgetEnabled={!!agent.widget_enabled}
          widgetId={widgetId ?? null}
        />
      </TabsContent>

      <TabsContent value="testing" className="mt-6">
        <AgentTestingTab agentId={agentId} />
      </TabsContent>

      <TabsContent value="analytics" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Run history</CardTitle>
            <CardDescription>Recent agent runs, status, trigger type, and duration.</CardDescription>
          </CardHeader>
          <CardContent>
            {runs.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No runs yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {runs.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                    <span className="text-sm">
                      <Badge variant={r.status === 'success' ? 'default' : r.status === 'failed' ? 'destructive' : 'secondary'} className="mr-2">
                        {r.status}
                      </Badge>
                      {r.trigger_type ?? 'chat'}
                      {r.duration_ms != null && (
                        <span className="ml-2 text-muted-foreground">({r.duration_ms}ms)</span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.started_at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
