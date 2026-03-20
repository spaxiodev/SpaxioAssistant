'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from 'next-intl';
import { Plus, Sparkles, Loader2 } from 'lucide-react';
import { AUTOMATION_TEMPLATES } from '@/lib/automations/templates';
import { AutomationsList } from './automations-list';
import { RecentRuns } from './recent-runs';
import { CreateAutomationModal } from './create-automation-modal';
import { AutomationsAnalyticsCard } from './automations-analytics-card';
import type { Automation } from '@/lib/supabase/database.types';
import type { RunWithName } from './recent-runs';
import type { GeneratedAutomationDraft } from '@/lib/automations/ai-workflow-generator';
import { useViewMode } from '@/contexts/view-mode-context';

type AgentOption = { id: string; name: string };

type Props = {
  automations: Automation[];
  agents: AgentOption[];
  runs: RunWithName[];
  canCreateAutomation?: boolean;
  limitBanner?: React.ReactNode;
};

export function AutomationsDashboardClient({ automations, agents, runs, canCreateAutomation = true, limitBanner }: Props) {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const { mode } = useViewMode();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createFromTemplateKey, setCreateFromTemplateKey] = useState<string | null>(null);
  const [editAutomation, setEditAutomation] = useState<Automation | null>(null);
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiDraft, setAiDraft] = useState<GeneratedAutomationDraft | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const openCreate = (templateKey?: string) => {
    setEditAutomation(null);
    setCreateFromTemplateKey(templateKey ?? null);
    setCreateModalOpen(true);
  };

  const openEdit = (a: Automation) => {
    setCreateFromTemplateKey(null);
    setEditAutomation(a);
    setCreateModalOpen(true);
  };

  const closeModal = () => {
    setCreateModalOpen(false);
    setCreateFromTemplateKey(null);
    setEditAutomation(null);
  };

  const handleGenerateDraft = async () => {
    if (!aiInstruction.trim()) return;
    setAiError(null);
    setAiLoading(true);
    setAiDraft(null);
    try {
      const res = await fetch('/api/automations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: aiInstruction.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate');
      setAiDraft(data.draft);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Failed to generate');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveDraftAsAutomation = async () => {
    if (!aiDraft) return;
    setAiSaving(true);
    setAiError(null);
    try {
      const createRes = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: aiDraft.name,
          description: aiDraft.description,
          status: 'draft',
          trigger_type: aiDraft.trigger_type,
          trigger_config: aiDraft.trigger_config,
          action_type: aiDraft.action_type,
          action_config: aiDraft.action_config,
        }),
      });
      const created = await createRes.json();
      if (!createRes.ok) throw new Error(created.error || 'Failed to create automation');
      const automationId = created.id;
      if (aiDraft.steps.length > 0) {
        const triggerId = 'trigger';
        const nodes = [
          { id: triggerId, type: 'trigger', position: { x: 0, y: 0 }, data: {} },
          ...aiDraft.steps.map((s, i) => ({
            id: `step-${i}`,
            type: 'step',
            position: { x: 200, y: i * 80 },
            data: {
              step_type: 'action',
              step_name: s.step_name,
              config_json: { action_type: s.action_type, action_config: s.action_config },
            },
          })),
        ];
        const edges = [
          ...Array.from({ length: aiDraft.steps.length }, (_, i) =>
            i === 0 ? { source: triggerId, target: `step-0` } : { source: `step-${i - 1}`, target: `step-${i}` }
          ),
        ];
        const stepsRes = await fetch(`/api/automations/${automationId}/steps`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nodes, edges }),
        });
        if (!stepsRes.ok) {
          const errData = await stepsRes.json();
          throw new Error(errData.error || 'Failed to save steps');
        }
      }
      setAiDraft(null);
      setAiInstruction('');
      router.refresh();
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setAiSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('automations')}</h1>
          <p className="text-muted-foreground">{t('automationsHero')}</p>
        </div>
        <Button onClick={() => canCreateAutomation && openCreate()} disabled={!canCreateAutomation}>
          <Plus className="mr-2 h-4 w-4" />
          {t('createAutomation')}
        </Button>
      </div>

      {limitBanner}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('templatesToGetStarted')}</CardTitle>
          <CardDescription>
            Start from a template and customize trigger and action.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {AUTOMATION_TEMPLATES.filter((template) =>
              mode === 'simple' ? template.visible_in_simple_mode : template.visible_in_developer_mode
            ).map((template) => {
              const Icon = template.icon;
              return (
                <button
                  key={template.key}
                  type="button"
                  onClick={() => openCreate(template.key)}
                  className="flex items-start gap-3 rounded-lg border border-border/50 bg-card/50 p-4 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{template.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                      {template.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate with AI
          </CardTitle>
          <CardDescription>
            Tell the AI what should happen automatically. It will create a draft you can edit and save.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="e.g. When someone submits a quote request, create a deal and send me an email."
            value={aiInstruction}
            onChange={(e) => setAiInstruction(e.target.value)}
            disabled={aiLoading}
            className="min-h-[80px]"
          />
          {aiError && <p className="text-sm text-destructive">{aiError}</p>}
          {!aiDraft ? (
            <Button onClick={handleGenerateDraft} disabled={!aiInstruction.trim() || aiLoading}>
              {aiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Generate draft
            </Button>
          ) : (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <p className="font-medium">{aiDraft.name}</p>
              {aiDraft.explanation && <p className="text-sm text-muted-foreground">{aiDraft.explanation}</p>}
              <p className="text-xs text-muted-foreground">
                Trigger: {aiDraft.trigger_type} · Action: {aiDraft.action_type}
                {aiDraft.steps.length > 0 && ` · ${aiDraft.steps.length} step(s)`}
              </p>
              {aiDraft.skipped?.length > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">Skipped: {aiDraft.skipped.join('; ')}</p>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveDraftAsAutomation} disabled={aiSaving}>
                  {aiSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create automation
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAiDraft(null)}>
                  Discard
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AutomationsAnalyticsCard />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('yourAutomations')}</CardTitle>
          <CardDescription>
            Manage, enable, or pause your automations. Use Test to run manually.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AutomationsList automations={automations} agents={agents} runs={runs} onEdit={openEdit} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('recentRuns')}</CardTitle>
          <CardDescription>
            {t('recentRunsDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecentRuns runs={runs} />
        </CardContent>
      </Card>

      <CreateAutomationModal
        open={createModalOpen || !!editAutomation}
        onClose={closeModal}
        onSuccess={() => { closeModal(); router.refresh(); }}
        initialTemplateKey={editAutomation ? null : createFromTemplateKey}
        editAutomation={editAutomation}
        agents={agents}
      />
    </div>
  );
}
