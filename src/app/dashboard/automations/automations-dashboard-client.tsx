'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { AUTOMATION_TEMPLATES } from '@/lib/automations/templates';
import { AutomationsList } from './automations-list';
import { RecentRuns } from './recent-runs';
import { CreateAutomationModal } from './create-automation-modal';
import { AutomationsAnalyticsCard } from './automations-analytics-card';
import type { Automation } from '@/lib/supabase/database.types';
import type { RunWithName } from './recent-runs';

type AgentOption = { id: string; name: string };

type Props = {
  automations: Automation[];
  agents: AgentOption[];
  runs: RunWithName[];
};

export function AutomationsDashboardClient({ automations, agents, runs }: Props) {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createFromTemplateKey, setCreateFromTemplateKey] = useState<string | null>(null);
  const [editAutomation, setEditAutomation] = useState<Automation | null>(null);

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

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('automations')}</h1>
          <p className="text-muted-foreground">{t('automationsHero')}</p>
        </div>
        <Button onClick={() => openCreate()}>
          <Plus className="mr-2 h-4 w-4" />
          {t('createAutomation')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('templatesToGetStarted')}</CardTitle>
          <CardDescription>
            Start from a template and customize trigger and action.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {AUTOMATION_TEMPLATES.map((template) => {
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
