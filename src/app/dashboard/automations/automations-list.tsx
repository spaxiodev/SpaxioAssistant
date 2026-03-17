'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ui/use-toast';
import { MoreHorizontal, Play, Pause, Pencil, Copy, Trash2, TestTube } from 'lucide-react';
import type { Automation } from '@/lib/supabase/database.types';
import { getTriggerLabel, getActionLabel } from '@/lib/automations/labels';

type AgentOption = { id: string; name: string };
type RunRecord = { id: string; automation_id: string; status: string; started_at: string; completed_at: string | null };

type Props = {
  automations: Automation[];
  agents: AgentOption[];
  runs: RunRecord[];
  onEdit: (a: Automation) => void;
};

export function AutomationsList({ automations, agents, runs, onEdit }: Props) {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const { toast } = useToast();
  const [testingId, setTestingId] = useState<string | null>(null);
  const [automationToDelete, setAutomationToDelete] = useState<Automation | null>(null);
  const [deleting, setDeleting] = useState(false);

  const lastRunByAutomationId = new Map<string | null, RunRecord>();
  runs.forEach((r) => {
    if (!lastRunByAutomationId.has(r.automation_id)) {
      lastRunByAutomationId.set(r.automation_id, r);
    }
  });

  const handleToggle = async (a: Automation) => {
    const newStatus = a.status === 'active' ? 'paused' : 'active';
    try {
      const res = await fetch(`/api/automations/${a.id}/toggle`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({ title: 'Error', description: data.error ?? 'Failed to toggle', variant: 'destructive' });
        return;
      }
      router.refresh();
      toast({ title: newStatus === 'active' ? t('enable') : t('pause') });
    } catch {
      toast({ title: 'Error', description: 'Request failed', variant: 'destructive' });
    }
  };

  const handleDeleteClick = (a: Automation) => {
    setAutomationToDelete(a);
  };

  const handleDeleteConfirm = async () => {
    if (!automationToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/automations/${automationToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({ title: 'Error', description: data.error ?? 'Failed to delete', variant: 'destructive' });
        return;
      }
      setAutomationToDelete(null);
      router.refresh();
      toast({ title: 'Automation deleted' });
    } catch {
      toast({ title: 'Error', description: 'Request failed', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = async (a: Automation) => {
    try {
      const res = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${a.name} (copy)`,
          description: a.description,
          trigger_type: a.trigger_type,
          trigger_config: a.trigger_config,
          action_type: a.action_type,
          action_config: a.action_config,
          agent_id: a.agent_id,
          template_key: a.template_key,
          status: 'draft',
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({ title: 'Error', description: data.error ?? 'Failed to duplicate', variant: 'destructive' });
        return;
      }
      router.refresh();
      toast({ title: 'Automation duplicated' });
    } catch {
      toast({ title: 'Error', description: 'Request failed', variant: 'destructive' });
    }
  };

  const handleTest = async (a: Automation) => {
    setTestingId(a.id);
    try {
      const res = await fetch(`/api/automations/${a.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: 'Error', description: data.error ?? 'Test failed', variant: 'destructive' });
        return;
      }
      toast({ title: 'Test run completed', description: data.status });
      router.refresh();
    } catch {
      toast({ title: 'Error', description: 'Test failed', variant: 'destructive' });
    } finally {
      setTestingId(null);
    }
  };

  const statusLabel =
    (s: string) =>
    (s === 'draft' ? t('automationStatusDraft') : s === 'active' ? t('automationStatusActive') : t('automationStatusPaused'));

  const agentName = (agentId: string | null) => agents.find((x) => x.id === agentId)?.name ?? t('noAgent');

  return (
    <>
      <div className="space-y-3">
        {automations.length === 0 ? (
          <p className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            {t('noAutomations')}
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border/50 bg-card/50">
            {automations.map((a) => {
              const lastRun = lastRunByAutomationId.get(a.id);
              return (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 first:pt-3 last:pb-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{a.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="secondary" className="font-normal">
                        {statusLabel(a.status)}
                      </Badge>
                      <span>{getTriggerLabel(a.trigger_type)}</span>
                      <span>→</span>
                      <span>{getActionLabel(a.action_type)}</span>
                      <span>·</span>
                      <span>{agentName(a.agent_id)}</span>
                      {lastRun && (
                        <>
                          <span>·</span>
                          <span>
                            {t('lastRun')}: {new Date(lastRun.started_at).toLocaleString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTest(a)}
                      disabled={testingId === a.id}
                    >
                      <TestTube className="mr-1 h-4 w-4" />
                      {t('testRun')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggle(a)}
                      disabled={a.status === 'draft'}
                    >
                      {a.status === 'active' ? (
                        <Pause className="mr-1 h-4 w-4" />
                      ) : (
                        <Play className="mr-1 h-4 w-4" />
                      )}
                      {a.status === 'active' ? t('pause') : t('enable')}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(a)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          {t('edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(a)}>
                          <Copy className="mr-2 h-4 w-4" />
                          {t('duplicate')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                          onClick={() => handleDeleteClick(a)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={!!automationToDelete} onOpenChange={(open) => !open && setAutomationToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('deleteAutomationTitle')}</DialogTitle>
            <DialogDescription>
              {automationToDelete
                ? t('deleteAutomationDescription', { name: automationToDelete.name })
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setAutomationToDelete(null)}
              disabled={deleting}
            >
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? '…' : t('deleteConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
